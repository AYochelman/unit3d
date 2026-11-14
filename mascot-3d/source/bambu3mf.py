"""
bambu3mf.py - write a Bambu Studio *project* .3mf (multi-plate, multi-part,
multi-filament, with saved settings) for a Bambu Lab P2S 0.4 nozzle + AMS.

Everything here mirrors what BambuStudio 2.x itself writes
(src/libslic3r/Format/bbs_3mf.cpp, _BBS_3MF_Exporter, and
PresetBundle::full_fff_config for Metadata/project_settings.config).

Public entry point: write_bambu_project(...)

The complete project config is built from the BambuStudio system profiles
(machine "Bambu Lab P2S 0.4 nozzle", process "0.12mm High Quality @BBL P2S",
filament "Bambu PLA Basic @BBL P2S") by resolving their inherits/include chains
exactly like PresetBundle::load_vendor_configs_from_json does.  The resolved
result is cached next to this file in bambu3mf_p2s_base.json, so the module
works without the BambuStudio source tree once that file exists.
"""

from __future__ import annotations

import datetime as _dt
import io
import json
import math
import os
import re
import zipfile
from typing import Any

import numpy as np

# ----------------------------------------------------------------------------
# Version / identity
# ----------------------------------------------------------------------------

# Written as "BambuStudio-<APP_VERSION>" (bbs_3mf.cpp: "%1%-%2%" % SLIC3R_APP_KEY % SLIC3R_VERSION).
# 02.03.00.70 is the first public release that ships the P2S profiles (tag v02.03.00.70).
# Plater::priv::load_files shows Newer3mfVersionDialog only when file_version > app_version
# (and minor or patch/100 differ) and does the "< 2.0.0" prime-tower conversion only for old
# files, so a P2S-era-minimum version never triggers either on any install that can drive a P2S.
APP_VERSION = "02.03.00.70"
BBS_3MF_VERSION = "1"  # VERSION_BBS_3MF, bbs_3mf.cpp

MACHINE_PRESET = "Bambu Lab P2S 0.4 nozzle"
PROCESS_PRESET = "0.12mm High Quality @BBL P2S"
FILAMENT_PRESET = "Bambu PLA Basic @BBL P2S"

_HERE = os.path.dirname(os.path.abspath(__file__))
BASE_CACHE = os.path.join(_HERE, "bambu3mf_p2s_base.json")
DEFAULT_BBS_ROOT = "/home/user/bambulab/bambustudio"

# bbs_3mf.cpp UUID suffixes
OBJECT_UUID_SUFFIX = "-61cb-4c03-9d28-80fed5dfa1dc"
SUB_OBJECT_UUID_SUFFIX = "-81cb-4c03-9d28-80fed5dfa1dc"
COMPONENT_UUID_SUFFIX = "-b206-40ff-9872-83e8017abed1"
BUILD_UUID = "2c7c17d8-22b5-4d84-8835-1976022ea369"
BUILD_UUID_SUFFIX = "-b1ec-4553-aec9-835e5b724bb4"

# PartPlate.cpp: static const double LOGICAL_PART_PLATE_GAP = 1. / 5.;
LOGICAL_PART_PLATE_GAP = 1.0 / 5.0

VALID_SUBTYPES = ("normal_part", "negative_part", "modifier_part", "support_enforcer", "support_blocker")

# ----------------------------------------------------------------------------
# Small helpers
# ----------------------------------------------------------------------------


def _xml_escape(s: str) -> str:
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace('"', "&quot;").replace("'", "&apos;"))


def _fmt(v: float) -> str:
    """std::stream with setprecision(max_digits10<float>=9), default float format == %.9g."""
    s = "%.9g" % float(v)
    if s == "-0":
        s = "0"
    return s


def _fmt_d(v: float) -> str:
    """model_settings.config uses setprecision(max_digits10<double>=17)."""
    s = "%.17g" % float(v)
    if s == "-0":
        s = "0"
    return s


def compute_column_count(count: int) -> int:
    """PartPlate.hpp compute_colum_count()."""
    value = math.sqrt(float(count))
    round_value = round(value)
    return int(round_value + 1) if value > round_value else int(round_value)


def plate_origin(plate_index0: int, plate_count: int, bed_w: float, bed_d: float) -> tuple[float, float]:
    """PartPlateList::compute_shape_position(index, cols):
         x =  (index % cols) * plate_width * (1 + LOGICAL_PART_PLATE_GAP)
         y = -(index / cols) * plate_depth * (1 + LOGICAL_PART_PLATE_GAP)
    cols = compute_colum_count(plate_count)."""
    cols = compute_column_count(plate_count)
    row, col = divmod(plate_index0, cols)
    return (col * bed_w * (1.0 + LOGICAL_PART_PLATE_GAP), -row * bed_d * (1.0 + LOGICAL_PART_PLATE_GAP))


# ----------------------------------------------------------------------------
# Source-tree parsing (only needed to (re)build the cached base config)
# ----------------------------------------------------------------------------

def _strip_cpp_comments(s: str) -> str:
    s = re.sub(r"/\*.*?\*/", "", s, flags=re.S)
    return re.sub(r"//[^\n]*", "", s)


def _brace_block(text: str, start_pat: str) -> str:
    m = re.search(start_pat, text)
    if not m:
        raise RuntimeError("pattern not found in source: " + start_pat)
    i = text.index("{", m.end() - 1)
    depth = 0
    for j in range(i, len(text)):
        if text[j] == "{":
            depth += 1
        elif text[j] == "}":
            depth -= 1
            if depth == 0:
                return _strip_cpp_comments(text[i + 1:j])
    raise RuntimeError("unbalanced block " + start_pat)


def _string_list(text: str, start_pat: str) -> list[str]:
    return re.findall(r'"([^"]*)"', _brace_block(text, start_pat))


def _parse_sources(src: str) -> dict:
    lib = os.path.join(src, "src", "libslic3r")
    preset = open(os.path.join(lib, "Preset.cpp"), encoding="utf-8").read()
    pb = open(os.path.join(lib, "PresetBundle.cpp"), encoding="utf-8").read()
    pc = open(os.path.join(lib, "PrintConfig.cpp"), encoding="utf-8").read()
    hpp = open(os.path.join(lib, "PrintConfig.hpp"), encoding="utf-8").read()

    info: dict[str, Any] = {}
    info["print_options"] = _string_list(preset, r"static std::vector<std::string> s_Preset_print_options\s*")
    info["filament_options"] = _string_list(preset, r"static std::vector<std::string> s_Preset_filament_options\s*")
    info["machine_limits_options"] = _string_list(preset, r"static std::vector<std::string> s_Preset_machine_limits_options\s*")
    info["printer_options"] = _string_list(preset, r"static std::vector<std::string> s_Preset_printer_options\s*")
    info["extruder_option_keys"] = _string_list(pc, r"m_extruder_option_keys = ")
    info["project_options"] = _string_list(pb, r"static std::vector<std::string> s_project_options\s*")
    info["legacy_ignore"] = _string_list(pc, r"static std::set<std::string> ignore = ")
    info["print_options_with_variant"] = _string_list(pc, r"std::set<std::string> print_options_with_variant = ")
    info["filament_options_with_variant"] = _string_list(pc, r"std::set<std::string> filament_options_with_variant = ")
    info["printer_options_with_variant_1"] = _string_list(pc, r"std::set<std::string> printer_options_with_variant_1 = ")
    info["printer_options_with_variant_2"] = _string_list(pc, r"std::set<std::string> printer_options_with_variant_2 = ")
    info["defs"] = dict(re.findall(r'this->add(?:_nullable)?\(\s*"([^"]+)"\s*,\s*(co\w+)\s*\)', pc))
    # filament_* retraction overrides are created in a loop from the printer extruder retract keys
    # (PrintConfigDef::init_fff_params, add_nullable(opt_key, ...)); treat them as defined.
    # Options created in loops (machine limits per axis, filament_* overrides) are not caught by the
    # regex above; every key of a preset option list is a defined option.
    for lst in ("print_options", "filament_options", "machine_limits_options", "printer_options", "extruder_option_keys"):
        for k in info[lst]:
            info["defs"].setdefault(k, "coLoopDefined")

    def cls_keys(name: str) -> list[str]:
        m = re.search(r"PRINT_CONFIG_CLASS_DEFINE\(\s*" + name + r"\s*,(.*?)\n\)", hpp, flags=re.S)
        if not m:
            raise RuntimeError("class not found " + name)
        return re.findall(r"\(\(\s*ConfigOption[\w<>:]*\s*,\s*(\w+)\s*\)\)", m.group(1))

    info["object_keys"] = cls_keys("PrintObjectConfig")
    info["region_keys"] = cls_keys("PrintRegionConfig")
    info["object_key_types"] = dict(
        (k, t) for t, k in re.findall(r"\(\(\s*(ConfigOption[\w<>:]*)\s*,\s*(\w+)\s*\)\)",
                                       re.search(r"PRINT_CONFIG_CLASS_DEFINE\(\s*PrintObjectConfig\s*,(.*?)\n\)", hpp, re.S).group(1)
                                       + re.search(r"PRINT_CONFIG_CLASS_DEFINE\(\s*PrintRegionConfig\s*,(.*?)\n\)", hpp, re.S).group(1)))
    enums = {}
    for m in re.finditer(r"static (?:const )?t_config_enum_values s_keys_map_(\w+)\s*=?\s*\{(.*?)\};", pc, flags=re.S):
        enums[m.group(1)] = re.findall(r'\{\s*"([^"]+)"\s*,', _strip_cpp_comments(m.group(2)))
    info["enums"] = enums
    return info


def _cpp_num(tok: str) -> str:
    tok = tok.strip().rstrip("fF")
    v = float(tok)
    return str(int(v)) if v.is_integer() else ("%g" % v)


def _parse_cpp_default(pc: str, key: str):
    """print_config_def default of `key` in project_settings form, or None if not a simple literal.
    Handles the literal forms used by the options a P2S profile never sets."""
    m = re.search(r'add(?:_nullable)?\(\s*"' + re.escape(key) + r'"\s*,\s*co\w+\s*\)', pc)
    if not m:
        return None
    seg = pc[m.end(): m.end() + 4000]
    nxt = re.search(r"this->add", seg)
    if nxt:
        seg = seg[:nxt.start()]
    d = re.search(r"set_default_value\(\s*new\s+(ConfigOption\w+(?:<\w+>)?)\s*([({])(.*?)[)}]\s*\)\s*;", seg, re.S)
    if not d:
        return None
    typ, body = d.group(1), d.group(3).strip()
    try:
        if typ.startswith("ConfigOptionEnum<"):
            enum = typ[len("ConfigOptionEnum<"):-1]
            val = body.split("::")[-1].strip()
            em = re.search(r"s_keys_map_" + enum + r"\s*=?\s*\{(.*?)\};", pc, re.S)
            for name, tok in re.findall(r'\{\s*"([^"]+)"\s*,\s*([^}]+?)\s*\}', em.group(1)):
                if re.sub(r"[^\w]", "", tok.split("::")[-1]) == val:
                    return name
            return None
        if typ in ("ConfigOptionFloat", "ConfigOptionInt", "ConfigOptionPercent"):
            return _cpp_num(body) + ("%" if typ == "ConfigOptionPercent" else "")
        if typ == "ConfigOptionBool":
            return "1" if body == "true" else "0"
        if typ == "ConfigOptionString":
            return re.fullmatch(r'"(.*)"', body).group(1)
        if typ in ("ConfigOptionFloats", "ConfigOptionInts", "ConfigOptionFloatsNullable", "ConfigOptionIntsNullable"):
            return [_cpp_num(t) for t in body.split(",") if t.strip()]
        if typ in ("ConfigOptionBools", "ConfigOptionBoolsNullable"):
            return ["1" if t.strip() == "true" else "0" for t in body.split(",") if t.strip()]
        if typ in ("ConfigOptionStrings",):
            return re.findall(r'"([^"]*)"', body)
        if typ in ("ConfigOptionPoints",) and body == "":
            return []
    except Exception:
        return None
    return None


# ----------------------------------------------------------------------------
# Profile resolution (PresetBundle::load_vendor_configs_from_json semantics)
# ----------------------------------------------------------------------------

_META_KEYS = {"type", "name", "inherits", "from", "setting_id", "filament_id", "instantiation", "include",
              "description", "renamed_from", "url", "is_custom_defined", "alias", "version"}

_LEGACY_RENAMES = {  # PrintConfigDef::handle_legacy (subset that renames keys)
    "enable_wipe_tower": "enable_prime_tower", "wipe_tower_width": "prime_tower_width",
    "bottom_solid_infill_flow_ratio": "initial_layer_flow_ratio", "wiping_volume": "filament_prime_volume",
    "prime_volume": "filament_prime_volume", "wipe_tower_brim_width": "prime_tower_brim_width",
    "tool_change_gcode": "change_filament_gcode", "bridge_fan_speed": "overhang_fan_speed",
    "infill_extruder": "sparse_infill_filament", "solid_infill_extruder": "solid_infill_filament",
    "perimeter_extruder": "wall_filament", "support_material_extruder": "support_filament",
    "support_material_interface_extruder": "support_interface_filament",
    "support_material_angle": "support_angle", "support_material_enforce_layers": "enforce_support_layers",
    "cooling": "slow_down_for_layer_cooling", "timelapse_no_toolhead": "timelapse_type",
    "infill_anchor": "sparse_infill_anchor", "infill_anchor_max": "sparse_infill_anchor_max",
}


class _Profiles:
    def __init__(self, bbl_dir: str):
        self.dir = bbl_dir
        idx = json.load(open(bbl_dir + ".json", encoding="utf-8"))
        self.version = idx.get("version")
        self.paths: dict[str, str] = {}
        for lst in ("machine_model_list", "machine_list", "process_list", "filament_list"):
            for e in idx.get(lst, []):
                self.paths[e["name"]] = os.path.join(bbl_dir, e["sub_path"])

    def raw(self, name: str) -> dict:
        return json.load(open(self.paths[name], encoding="utf-8"))

    def resolve(self, name: str) -> tuple[dict, list[str], dict]:
        """Returns (config, inherits chain, meta) - config holds only keys the json chain sets;
        keys never set fall back to print_config_def defaults (taken later from a reference project)."""
        d = self.raw(name)
        chain = [name]
        meta = {k: d[k] for k in ("setting_id", "filament_id") if k in d}
        if d.get("inherits"):
            out, ch, pmeta = self.resolve(d["inherits"])
            chain += ch
            for k, v in pmeta.items():
                meta.setdefault(k, v)
        else:
            out = {}
        out = dict(out)
        inc = d.get("include") or []
        if isinstance(inc, str):
            inc = [inc]
        for i in inc:
            # include_config.diff(default_preset) is applied; every include value used by the
            # P2S chain differs from the print_config_def default (3-variant vectors vs 1-element
            # defaults, printer specific g-code), so all included keys are applied.
            inc_cfg = self.resolve(i)[0] if self.raw(i).get("inherits") else {
                k: v for k, v in self.raw(i).items() if k not in _META_KEYS}
            out.update(inc_cfg)
        for k, v in d.items():
            if k not in _META_KEYS:
                out[k] = v
        return out, chain, meta


def _legacy_convert(cfg: dict, info: dict) -> dict:
    out = {}
    ignore = set(info["legacy_ignore"])
    defs = info["defs"]
    for k, v in cfg.items():
        if k in _LEGACY_RENAMES:
            k = _LEGACY_RENAMES[k]
        if k == "wall_infill_order":
            if v in ("inner wall/outer wall/infill", "infill/inner wall/outer wall"):
                v = "inner wall/outer wall"
            elif v in ("outer wall/inner wall/infill", "infill/outer wall/inner wall"):
                v = "outer wall/inner wall"
            elif v == "inner-outer-inner wall/infill":
                v = "inner-outer-inner wall"
            k = "wall_sequence"
        if k in ignore or k not in defs:
            continue
        out[k] = v
    return out


def build_base(bbs_root: str = DEFAULT_BBS_ROOT, cache_path: str | None = BASE_CACHE) -> dict:
    """Resolve the P2S system presets into the pieces PresetBundle::full_fff_config() combines."""
    info = _parse_sources(bbs_root)
    profiles = _Profiles(os.path.join(bbs_root, "resources", "profiles", "BBL"))
    machine, m_chain, m_meta = profiles.resolve(MACHINE_PRESET)
    process, p_chain, p_meta = profiles.resolve(PROCESS_PRESET)
    filament, f_chain, f_meta = profiles.resolve(FILAMENT_PRESET)
    compat_printers = profiles.raw(PROCESS_PRESET).get("compatible_printers", [])
    machine = _legacy_convert(machine, info)
    process = _legacy_convert(process, info)
    filament = _legacy_convert(filament, info)

    # Reference project written by BambuStudio 2.x itself for a single-extruder multi-variant
    # machine (H2S, "Direct Drive Standard/High Flow").  Supplies print_config_def default values
    # for keys no P2S profile sets (it has 12 filaments, 2 variants).
    ref_3mf = os.path.join(bbs_root, "resources", "calib", "pressure_advance", "auto_pa_line_single_all.3mf")
    with zipfile.ZipFile(ref_3mf) as z:
        ref = json.loads(z.read("Metadata/project_settings.config"))
    ref_nf = len(ref["filament_colour"])
    ref_nvar = len(ref["print_extruder_variant"])

    print_keys = set(info["print_options"])
    filament_keys = set(info["filament_options"])
    printer_keys = set(info["printer_options"]) | set(info["machine_limits_options"]) | set(info["extruder_option_keys"])
    project_keys = set(info["project_options"])
    pv = set(info["print_options_with_variant"])
    fv = set(info["filament_options_with_variant"])
    prv1 = set(info["printer_options_with_variant_1"])
    prv2 = set(info["printer_options_with_variant_2"])
    defs = info["defs"]
    ignore = set(info["legacy_ignore"])

    # Preset::remove_invalid_keys(): a preset only keeps the keys of its own option list.
    dropped = {"printer": sorted(set(machine) - printer_keys), "process": sorted(set(process) - print_keys),
               "filament": sorted(set(filament) - filament_keys)}
    machine = {k: v for k, v in machine.items() if k in printer_keys}
    process = {k: v for k, v in process.items() if k in print_keys}
    filament = {k: v for k, v in filament.items() if k in filament_keys}

    n_var = len(process["print_extruder_variant"])
    n_pvar = len(machine["printer_extruder_variant"])
    n_fvar = len(filament["filament_extruder_variant"])

    notes = []
    # fill keys of each preset type that the json chain does not set, from the reference
    for k, v in ref.items():
        if k in ("name", "from", "version") or k in ignore or k not in defs:
            continue
        if k in printer_keys and k not in machine:
            if k in prv2 and isinstance(v, list):
                v = (v[:2] * n_pvar)
            elif k in prv1 and isinstance(v, list):
                v = [v[0]] * n_pvar
            machine[k] = v
            notes.append(("printer-default", k))
        elif k in print_keys and k not in process:
            if k in pv and isinstance(v, list):
                v = [v[0]] * n_var
            process[k] = v
            notes.append(("print-default", k))
        elif k in filament_keys and k not in filament:
            if isinstance(v, list):
                per = max(1, len(v) // ref_nf)
                v = v[:per]
                if k in fv:
                    v = [v[0]] * n_fvar
            filament[k] = v
            notes.append(("filament-default", k))

    # Newer than the reference and set by no profile: print_config_def default is {nil}
    # (PrintConfigDef::init_fff_params, filament_extruder_override_keys loop).
    for k in ("filament_retract_length_toolchange", "filament_retract_restart_extra_toolchange"):
        if k in filament_keys and k not in filament:
            filament[k] = ["nil"] * n_fvar
            notes.append(("filament-default-nil", k))

    # Options newer than the reference that no profile sets: print_config_def literal default.
    pc_text = open(os.path.join(bbs_root, "src", "libslic3r", "PrintConfig.cpp"), encoding="utf-8").read()
    skip = {"compatible_printers", "compatible_printers_condition", "compatible_prints", "compatible_prints_condition",
            "inherits", "print_host", "print_host_webui", "printhost_apikey", "printhost_cafile", "printhost_password",
            "printhost_port", "printhost_user"} | ignore
    unresolved = []
    for keys, cfg in ((printer_keys, machine), (print_keys, process), (filament_keys, filament)):
        for k in sorted(keys):
            if k in cfg or k in skip:
                continue
            dv = _parse_cpp_default(pc_text, k)
            if dv is None:
                unresolved.append(k)
                continue
            cfg[k] = dv
            notes.append(("print_config_def-default", k))

    # Re-serialise the few profile literals BambuStudio would write differently after parsing
    # (ConfigOptionPercent::serialize appends '%', ConfigOptionPoints writes a lower-case 'x').
    def _num(t: str) -> str:
        f = float(t)
        return str(int(f)) if f.is_integer() else repr(f)
    for cfg in (machine, process, filament):
        for k, v in list(cfg.items()):
            t = defs.get(k)
            if t == "coPercent" and isinstance(v, str) and v and not v.endswith("%"):
                cfg[k] = _num(v) + "%"
            elif t in ("coPoints", "coPoint"):
                cfg[k] = [x.replace("X", "x") for x in v] if isinstance(v, list) else v.replace("X", "x")

    # Keys of FullPrintConfig that belong to no preset (project / runtime keys)
    other = {}
    for k, v in ref.items():
        if k in ("name", "from", "version") or k in ignore or k not in defs:
            continue
        if k in printer_keys or k in print_keys or k in filament_keys or k in project_keys:
            continue
        other[k] = v
    project_defaults = {k: ref[k] for k in info["project_options"] if k in ref and k in defs}

    base = {
        "bambustudio_source_version": open(os.path.join(bbs_root, "version.inc")).read().split('SLIC3R_VERSION "')[1].split('"')[0],
        "profiles_version": profiles.version,
        "machine_preset": MACHINE_PRESET, "process_preset": PROCESS_PRESET, "filament_preset": FILAMENT_PRESET,
        "machine_chain": m_chain, "process_chain": p_chain, "filament_chain": f_chain,
        "filament_id": f_meta.get("filament_id", ""),
        "print_compatible_printers": compat_printers,
        "printer": machine, "process": process, "filament": filament,
        "other": other, "project_defaults": project_defaults,
        "reference_filament_count": ref_nf, "reference_variant_count": ref_nvar,
        "sets": {
            "print_options": sorted(print_keys), "filament_options": sorted(filament_keys),
            "printer_options": sorted(printer_keys), "project_options": info["project_options"],
            "print_options_with_variant": sorted(pv), "filament_options_with_variant": sorted(fv),
            "printer_options_with_variant_1": sorted(prv1), "printer_options_with_variant_2": sorted(prv2),
            "object_keys": info["object_keys"], "region_keys": info["region_keys"],
            "object_key_types": info["object_key_types"], "enums": info["enums"],
        },
        "filled_from_reference": notes,
        "dropped_invalid_keys": dropped,
        "unresolved_default_keys": unresolved,
    }
    if cache_path:
        with open(cache_path, "w", encoding="utf-8") as fh:
            json.dump(base, fh, indent=1, ensure_ascii=False, sort_keys=True)
    return base


_BASE: dict | None = None


def load_base(bbs_root: str | None = None) -> dict:
    global _BASE
    if _BASE is not None and bbs_root is None:
        return _BASE
    if bbs_root is None and os.path.exists(BASE_CACHE):
        _BASE = json.load(open(BASE_CACHE, encoding="utf-8"))
    else:
        _BASE = build_base(bbs_root or DEFAULT_BBS_ROOT)
    return _BASE


# ----------------------------------------------------------------------------
# Value normalisation
# ----------------------------------------------------------------------------

# option key -> enum map name (PrintConfig.cpp s_keys_map_<Name>) for validation of overrides
_ENUM_KEYS = {
    "support_type": "SupportType", "brim_type": "BrimType", "sparse_infill_pattern": "InfillPattern",
    "top_surface_pattern": "InfillPattern", "bottom_surface_pattern": "InfillPattern",
    "internal_solid_infill_pattern": "InfillPattern", "support_style": "SupportMaterialStyle",
    "support_base_pattern": "SupportMaterialPattern", "support_interface_pattern": "SupportMaterialInterfacePattern",
    "wall_sequence": "WallSequence", "seam_position": "SeamPosition", "ironing_type": "IroningType",
    "print_sequence": "PrintSequence", "ensure_vertical_shell_thickness": "EnsureVerticalThicknessLevel",
    "top_one_wall_type": "TopOneWallType", "wall_generator": "PerimeterGeneratorType",
    "curr_bed_type": "BedType", "timelapse_type": "TimelapseType", "fuzzy_skin": "FuzzySkinType",
}


def _scalar_str(v: Any) -> str:
    if isinstance(v, bool):
        return "1" if v else "0"  # ConfigOptionBool::deserialize accepts only "1"/"0"
    if isinstance(v, (int, np.integer)):
        return str(int(v))
    if isinstance(v, (float, np.floating)):
        f = float(v)
        if f.is_integer():
            return str(int(f))
        return repr(f)
    return str(v)


def _check_enum(base: dict, key: str, value: str) -> None:
    enum = _ENUM_KEYS.get(key)
    if enum is None:
        return
    allowed = base["sets"]["enums"].get(enum)
    if allowed and value not in allowed:
        raise ValueError(f"{key}={value!r} is not a valid {enum}; allowed: {allowed}")


def _normalize_option(base: dict, key: str, value: Any, base_value: Any, variant_len: int | None) -> Any:
    """Value in project_settings.config form: str for scalar options, list[str] for vectors."""
    if isinstance(base_value, list):
        if isinstance(value, (list, tuple)):
            vals = [_scalar_str(x) for x in value]
        else:
            vals = [_scalar_str(value)]
        target = variant_len if variant_len else len(base_value)
        if len(vals) == 1 and target > 1:
            vals = vals * target
        try:
            if len(vals) == len(base_value) and all(float(a) == float(b) for a, b in zip(vals, base_value)):
                return list(base_value)
        except ValueError:
            pass
        return vals
    if isinstance(value, (list, tuple)):
        raise ValueError(f"{key} is a scalar option, got a list")
    s = _scalar_str(value)
    if isinstance(base_value, str):
        # ConfigOptionPercent: keep the '%' form; equal numbers keep the system spelling (no false diff)
        if base_value.endswith("%") and not s.endswith("%") and re.fullmatch(r"-?[\d.]+", s):
            s += "%"
        try:
            if float(s.rstrip("%")) == float(base_value.rstrip("%")) and s.endswith("%") == base_value.endswith("%"):
                s = base_value
        except ValueError:
            pass
    _check_enum(base, key, s)
    return s


def _norm_colour(c: str) -> str:
    c = c.strip()
    if not c.startswith("#"):
        c = "#" + c
    if len(c) not in (7, 9) or not re.fullmatch(r"#[0-9A-Fa-f]+", c):
        raise ValueError("colour must be #RRGGBB or #RRGGBBAA: " + c)
    return c.upper()


# ----------------------------------------------------------------------------
# Flush volumes (Sidebar::auto_calc_flushing_volumes_internal + FlushVolCalculator, colour formula)
# ----------------------------------------------------------------------------

def _rgb2hsv(r, g, b):
    cmax, cmin = max(r, g, b), min(r, g, b)
    delta = cmax - cmin
    if abs(delta) < 0.001:
        h = 0.0
    elif cmax == r:
        h = 60.0 * math.fmod((g - b) / delta, 6.0)
    elif cmax == g:
        h = 60.0 * ((b - r) / delta + 2)
    else:
        h = 60.0 * ((r - g) / delta + 4)
    s = 0.0 if abs(cmax) < 0.001 else delta / cmax
    return h, s, cmax


def _flush_rgb(src, dst) -> float:
    sr, sg, sb = [x / 255.0 for x in src]
    dr, dg, db = [x / 255.0 for x in dst]
    h1, s1, v1 = _rgb2hsv(sr, sg, sb)
    h2, s2, v2 = _rgb2hsv(dr, dg, db)
    dx = math.cos(math.radians(h1)) * s1 * v1 - math.cos(math.radians(h2)) * s2 * v2
    dy = math.sin(math.radians(h1)) * s1 * v1 - math.sin(math.radians(h2)) * s2 * v2
    hs_dist = min(1.2, math.sqrt(dx * dx + dy * dy))
    lum = lambda r, g, b: r * 0.3 + g * 0.59 + b * 0.11
    from_l, to_l = lum(sr, sg, sb), lum(dr, dg, db)
    if to_l >= from_l:
        lumi_flush = math.pow(to_l - from_l, 0.7) * 560.0
    else:
        lumi_flush = (from_l - to_l) * 80.0
        hs_dist = min(0.67 * v2 + 0.33 * v1, hs_dist)
    hs_flush = 230.0 * hs_dist
    vol = math.sqrt(hs_flush ** 2 + lumi_flush ** 2 - 2 * hs_flush * lumi_flush * math.cos(math.radians(120.0)))
    return max(vol, 60.0)


def flush_volumes_matrix(colours: list[str], min_flush: int = 110, max_flush: int = 900) -> list[str]:
    """Single-extruder n*n matrix, row = from, col = to, diagonal 0.  min_flush is
    get_min_flush_volumes() = nozzle_volume (110 for P2S) - long-retraction volume (0 for P2S)."""
    rgb = [tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) for c in colours]
    n = len(rgb)
    out = []
    for i in range(n):
        for j in range(n):
            if i == j:
                out.append("0")
            else:
                out.append(str(min(int(_flush_rgb(rgb[i], rgb[j]) + min_flush), max_flush)))
    return out


# ----------------------------------------------------------------------------
# Metadata/project_settings.config  (PresetBundle::full_fff_config(apply_extruder=false))
# ----------------------------------------------------------------------------

def build_project_settings(filaments: list[dict], process_overrides: dict | None, plate_count: int,
                           wipe_tower_xy: list[tuple[float, float]] | None = None,
                           bed_type: str = "Textured PEI Plate", app_version: str = APP_VERSION,
                           ams_count: str = "1#0|4#1", base: dict | None = None) -> dict:
    base = base or load_base()
    sets = base["sets"]
    print_keys, filament_keys, printer_keys = set(sets["print_options"]), set(sets["filament_options"]), set(sets["printer_options"])
    project_keys = set(sets["project_options"])
    pv, fv = set(sets["print_options_with_variant"]), set(sets["filament_options_with_variant"])
    prv1, prv2 = set(sets["printer_options_with_variant_1"]), set(sets["printer_options_with_variant_2"])

    nf = len(filaments)
    if nf < 1:
        raise ValueError("need at least one filament")
    process = dict(base["process"])
    printer = dict(base["printer"])
    fil_cfgs = [dict(base["filament"]) for _ in range(nf)]
    n_var = len(process["print_extruder_variant"])
    n_pvar = len(printer["printer_extruder_variant"])

    process_diff, printer_diff = set(), set()
    filament_diff = [set() for _ in range(nf)]

    # per-filament type: the preset is PLA Basic; a different type is a preset modification
    for i, f in enumerate(filaments):
        ftype = f.get("type")
        if ftype and [ftype] != fil_cfgs[i]["filament_type"]:
            fil_cfgs[i]["filament_type"] = [ftype]
            filament_diff[i].add("filament_type")

    project_set = {}
    for key, value in (process_overrides or {}).items():
        if key in print_keys:
            new = _normalize_option(base, key, value, process.get(key), n_var if key in pv else None)
            if new != process.get(key):
                process[key] = new
                process_diff.add(key)
        elif key in filament_keys:
            for i in range(nf):
                bv = fil_cfgs[i].get(key)
                new = _normalize_option(base, key, value, bv, len(fil_cfgs[i]["filament_extruder_variant"]) if key in fv else None)
                if new != bv:
                    fil_cfgs[i][key] = new
                    filament_diff[i].add(key)
        elif key in printer_keys:
            vl = n_pvar if key in prv1 else (2 * n_pvar if key in prv2 else None)
            new = _normalize_option(base, key, value, printer.get(key), vl)
            if new != printer.get(key):
                printer[key] = new
                printer_diff.add(key)
        elif key in project_keys:
            project_set[key] = value
        else:
            raise ValueError(f"unknown option {key!r} (not a print/filament/printer/project option of BambuStudio)")

    out: dict[str, Any] = {}
    out.update(base["other"])      # FullPrintConfig keys owned by no preset
    out.update(process)            # prints.get_edited_preset().config
    out.update(printer)            # printers.get_edited_preset().config
    # project_config (s_project_options)
    colours = [_norm_colour(f["color"]) for f in filaments]
    proj = dict(base["project_defaults"])
    proj.update({
        "filament_colour": colours,
        "filament_multi_colour": list(colours),
        "filament_colour_type": ["1"] * nf,
        "filament_is_mixed": ["0"] * nf,
        "filament_mixed_components": [""] * nf,
        "filament_mixed_sublayer_ratios": [""] * nf,
        "filament_mixed_gradient": ["0"] * nf,
        "filament_mixed_gradient_range": [""] * nf,
        "filament_mixed_gradient_curve": [""] * nf,
        "filament_mixed_gradient_per_part": ["0"] * nf,
        "filament_map": ["1"] * nf,
        "filament_volume_map": ["0"] * nf,
        "filament_nozzle_map": ["1"] + ["0"] * (nf - 1),
        "filament_map_mode": "Auto For Flush",
        "flush_volumes_matrix": flush_volumes_matrix(colours, min_flush=int(float(printer["nozzle_volume"][0]))),
        "flush_volumes_vector": ["140"] * (2 * nf),
        "flush_multiplier": ["1"],
        "flush_multiplier_fast": ["1.2"],
        "curr_bed_type": bed_type,
        # NozzleInventory::export_to() for one extruder with one installed Standard 0.4 nozzle
        "nozzle_volume_type": ["Standard"],
        "extruder_nozzle_stats": ["Standard#1"],
        "extruder_nozzle_stats_new": ["Standard#1"],
        "extruder_nozzle_count": ["1"],
        "extruder_nozzle_volume_type": ["Standard"],
        "extruder_nozzle_diameter": [printer["nozzle_diameter"][0]],
        "extruder_nozzle_slot": ["0"],
        "prime_volume_mode": "Default",
        "enable_filament_dynamic_map": "0",
        "has_filament_switcher": "0",
        "wipe_tower_rotation_angle": "0",
    })
    _check_enum(base, "curr_bed_type", bed_type)
    bw, bd = bed_size(base)
    if wipe_tower_xy is None:
        wipe_tower_xy = [None] * plate_count
    wx, wy = [], []
    for p in range(plate_count):
        xy = wipe_tower_xy[p] if p < len(wipe_tower_xy) else None
        if xy is None:
            xy = default_wipe_tower_xy(base)
        wx.append(_scalar_str(round(float(xy[0]), 3)))
        wy.append(_scalar_str(round(float(xy[1]), 3)))
    proj["wipe_tower_x"], proj["wipe_tower_y"] = wx, wy
    for k, v in project_set.items():
        proj[k] = v if isinstance(v, (list, str)) else _scalar_str(v)
    out.update(proj)

    # filaments: vector options are appended filament by filament, scalars from the first filament
    for key in sets["filament_options"]:
        if key in ("compatible_prints", "compatible_printers"):
            continue
        if key not in fil_cfgs[0]:
            continue
        v0 = fil_cfgs[0][key]
        if isinstance(v0, list):
            vals: list[str] = []
            for cfg in fil_cfgs:
                vals.extend(cfg[key])
            out[key] = vals
        else:
            out[key] = v0
    # filament_self_index: one entry per filament variant row (full_fff_config, !apply_extruder branch)
    self_index = []
    for i, cfg in enumerate(fil_cfgs):
        self_index += [str(i + 1)] * len(cfg["filament_extruder_variant"])
    out["filament_self_index"] = self_index

    for k in ("compatible_prints", "compatible_prints_condition", "compatible_printers",
              "compatible_printers_condition", "inherits", "different_settings_to_system", "filament_map_2",
              "inherits_group", "compatible_machine_expression_group", "compatible_process_expression_group"):
        out.pop(k, None)
    for k in ("support_filament", "support_interface_filament"):
        if k in out:
            out[k] = str(max(0, min(int(out[k]), nf)))

    out["print_settings_id"] = base["process_preset"]
    out["filament_settings_id"] = [base["filament_preset"]] * nf
    out["printer_settings_id"] = base["machine_preset"]
    out["filament_ids"] = [base["filament_id"]] * nf
    out["filament_map"] = ["1"] * nf
    # inherits_group: system presets have empty "inherits" -> all empty -> not stored (add_if_some_non_empty)
    diff = [";".join(sorted(process_diff))] + [";".join(sorted(d)) for d in filament_diff] + [";".join(sorted(printer_diff))]
    if any(diff):
        out["different_settings_to_system"] = diff
    if base["print_compatible_printers"]:
        out["print_compatible_printers"] = list(base["print_compatible_printers"])
    out["extruder_ams_count"] = [ams_count, ""]

    out["name"] = "project_settings"
    out["from"] = "project"
    out["version"] = app_version
    return dict(sorted(out.items()))


def bed_size(base: dict | None = None) -> tuple[float, float]:
    base = base or load_base()
    pts = [tuple(float(c) for c in p.split("x")) for p in base["printer"]["printable_area"]]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return max(xs) - min(xs), max(ys) - min(ys)


def default_wipe_tower_xy(base: dict | None = None) -> tuple[float, float]:
    """get_wipe_tower_default_pos(): default_wipe_tower_pos (normalised) * plate size, then kept inside the
    bed for a prime_tower_width-wide tower (BambuStudio pulls a default back the same way)."""
    base = base or load_base()
    bw, bd = bed_size(base)
    nx, ny = (float(c) for c in base["printer"].get("default_wipe_tower_pos", "0.644x0.977").split("x"))
    w = float(base["process"].get("prime_tower_width", "60"))
    margin = 10.0
    top = bd
    # stay clear of the wrapping-detection exclusion strip at the back (forbidden when that option is on)
    wrap = [tuple(float(c) for c in p.split("x")) for p in base["printer"].get("wrapping_exclude_area", [])]
    if wrap:
        top = min(top, min(p[1] for p in wrap))
    return min(nx * bw, bw - w - margin), min(ny * bd, top - w - margin)


# ----------------------------------------------------------------------------
# Geometry / XML
# ----------------------------------------------------------------------------

_MODEL_NS = ('<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" '
             'xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" '
             'xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p">\n')


def _transform_3mf(tx: float, ty: float, tz: float) -> str:
    """3MF column-major 3x4 (bbs_3mf.cpp add_transformation: for c<4, for r<3: m(r,c))."""
    return " ".join(_fmt(x) for x in (1, 0, 0, 0, 1, 0, 0, 0, 1, tx, ty, tz))


def _matrix_4x4(tx: float, ty: float, tz: float) -> str:
    """model_settings.config 'matrix' (row-major 4x4, double precision)."""
    return " ".join(_fmt_d(x) for x in (1, 0, 0, tx, 0, 1, 0, ty, 0, 0, 1, tz, 0, 0, 0, 1))


def _mesh_xml(verts: np.ndarray, faces: np.ndarray) -> str:
    vf = verts.astype(np.float32).astype(np.float64).ravel().tolist()
    vtxt = ('     <vertex x="%.9g" y="%.9g" z="%.9g"/>\n' * len(verts)) % tuple(vf) if len(verts) else ""
    vtxt = vtxt.replace('"-0"', '"0"')
    ft = faces.astype(np.int64).ravel().tolist()
    ttxt = ('     <triangle v1="%d" v2="%d" v3="%d"/>\n' * len(faces)) % tuple(ft) if len(faces) else ""
    return "   <mesh>\n    <vertices>\n" + vtxt + "    </vertices>\n    <triangles>\n" + ttxt + "    </triangles>\n   </mesh>\n"


def _uuid(n: int, suffix: str) -> str:
    return "%08x%s" % (n & 0xFFFFFFFF, suffix)


def _png_small(png: bytes, size: int = 128) -> bytes:
    """plate_N_small.png: box-average down-sample to 128x128 like _add_thumbnail_file_to_archive."""
    from PIL import Image  # pillow is available; only used when thumbnails are given
    im = Image.open(io.BytesIO(png)).convert("RGBA")
    sw, sh = max(1, im.width // size), max(1, im.height // size)
    im = im.crop((0, 0, sw * size, sh * size)).reduce((sw, sh)) if (sw > 1 or sh > 1) else im.resize((size, size))
    if im.size != (size, size):
        im = im.resize((size, size))
    buf = io.BytesIO()
    im.save(buf, format="PNG")
    return buf.getvalue()


def _object_settings_xml(base: dict, settings: dict, extruder: int) -> list[tuple[str, str]]:
    sets = base["sets"]
    valid = set(sets["object_keys"]) | set(sets["region_keys"])
    pv = set(sets["print_options_with_variant"])
    n_var = len(base["process"]["print_extruder_variant"])
    items = {"extruder": str(int(extruder))}
    for k, v in (settings or {}).items():
        if k == "extruder":
            items[k] = str(int(v))
            continue
        if k not in valid:
            raise ValueError(f"{k!r} is not a per-object option (PrintObjectConfig/PrintRegionConfig)")
        if k in pv:
            vals = [_scalar_str(x) for x in v] if isinstance(v, (list, tuple)) else [_scalar_str(v)] * n_var
            items[k] = ",".join(vals)       # ConfigOptionVector serialize: comma separated
        else:
            s = _scalar_str(v)
            _check_enum(base, k, s)
            items[k] = s
    return sorted(items.items())            # DynamicConfig::keys() is sorted


def write_bambu_project(out_path: str, plates: list[dict], filaments: list[dict], process_overrides: dict | None = None,
                        thumbnails: dict | None = None, project_name: str = "UNIT3D", *,
                        bed_type: str = "Textured PEI Plate", app_version: str = APP_VERSION,
                        ams_count: str = "1#0|4#1", bbs_root: str | None = None) -> dict:
    """Write a BambuStudio project 3mf.  Returns a small summary dict (object ids, plate origins...)."""
    base = load_base(bbs_root)
    bw, bd = bed_size(base)
    n_plates = len(plates)
    if n_plates < 1:
        raise ValueError("need at least one plate")
    nf = len(filaments)

    # ---------------- ids (bbs_3mf.cpp _add_model_file_to_archive, non-backup save) ----------------
    objects = []      # flattened
    next_id = 1
    identify = 100
    for p_idx, plate in enumerate(plates):
        ox, oy = plate_origin(p_idx, n_plates, bw, bd)
        for obj in plate.get("objects", []):
            parts = obj.get("parts") or []
            if not parts:
                raise ValueError(f"object {obj.get('name')!r} has no parts")
            backup_id = len(objects) + 1
            vol_ids = list(range(next_id, next_id + len(parts)))
            obj_id = next_id + len(parts)
            next_id = obj_id + 1
            identify += 1
            objects.append(dict(src=obj, plate=p_idx, backup_id=backup_id, vol_ids=vol_ids, obj_id=obj_id,
                                identify_id=identify, world=(ox + float(obj.get("x", 0.0)), oy + float(obj.get("y", 0.0)), 0.0)))

    # ---------------- per part geometry ----------------
    for o in objects:
        prepared = []
        for part in o["src"]["parts"]:
            v = np.asarray(part["vertices"], dtype=np.float64)
            f = np.asarray(part["faces"], dtype=np.int64)
            if v.ndim != 2 or v.shape[1] != 3 or f.ndim != 2 or f.shape[1] != 3 or len(v) == 0 or len(f) == 0:
                raise ValueError(f"part {part.get('name')!r}: vertices (N,3) and faces (M,3) required")
            if not np.isfinite(v).all() or f.min() < 0 or f.max() >= len(v):
                raise ValueError(f"part {part.get('name')!r}: invalid vertex data / face indices")
            sub = part.get("subtype", "normal_part")
            if sub not in VALID_SUBTYPES:
                raise ValueError(f"part {part.get('name')!r}: subtype must be one of {VALID_SUBTYPES}")
            ext = int(part.get("extruder", 0) or 0)
            if ext < 0 or ext > nf:
                raise ValueError(f"part {part.get('name')!r}: extruder {ext} outside 1..{nf}")
            # ModelVolume::center_geometry_after_creation(): mesh stored around its bbox centre,
            # the offset lives in the component transform / volume matrix.
            c = (v.min(axis=0) + v.max(axis=0)) / 2.0
            c = c.astype(np.float32).astype(np.float64)
            prepared.append(dict(part=part, sub=sub, ext=ext, center=c, verts=v - c, faces=f))
        o["parts"] = prepared
        normals = [pp for pp in prepared if pp["sub"] == "normal_part"]
        if not normals:
            raise ValueError(f"object {o['src'].get('name')!r} needs at least one normal_part")
        o["extruder"] = next((pp["ext"] for pp in normals if pp["ext"] > 0), 1)

    today = _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%d")
    has_thumb = bool(thumbnails) and 1 in thumbnails

    files: list[tuple[str, bytes, bool]] = []   # (name, data, compress)

    # [Content_Types].xml (identical for every BambuStudio 3mf)
    files.append(("[Content_Types].xml", (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n'
        ' <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n'
        ' <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>\n'
        ' <Default Extension="png" ContentType="image/png"/>\n'
        ' <Default Extension="gcode" ContentType="text/x.gcode"/>\n'
        '</Types>').encode(), True))

    # thumbnails: Metadata/plate_N.png, plate_N_small.png, plate_no_light_N.png
    plate_thumbs = {}
    for p_idx in range(n_plates):
        t = (thumbnails or {}).get(p_idx + 1)
        if t is None:
            continue
        if isinstance(t, (bytes, bytearray)):
            t = {"plate": bytes(t)}
        entry = {}
        files.append((f"Metadata/plate_{p_idx + 1}.png", t["plate"], False))
        files.append((f"Metadata/plate_{p_idx + 1}_small.png", t.get("small") or _png_small(t["plate"]), False))
        files.append((f"Metadata/plate_no_light_{p_idx + 1}.png", t.get("no_light") or t["plate"], False))
        entry["thumbnail_file"] = f"Metadata/plate_{p_idx + 1}.png"
        entry["thumbnail_no_light_file"] = f"Metadata/plate_no_light_{p_idx + 1}.png"
        if t.get("top") and t.get("pick"):
            files.append((f"Metadata/top_{p_idx + 1}.png", t["top"], False))
            files.append((f"Metadata/pick_{p_idx + 1}.png", t["pick"], False))
            entry["top_file"] = f"Metadata/top_{p_idx + 1}.png"
            entry["pick_file"] = f"Metadata/pick_{p_idx + 1}.png"
        plate_thumbs[p_idx] = entry

    # 3D/3dmodel.model (root: metadata + component objects + build)
    meta = {
        "Application": "BambuStudio-" + app_version,
        "BambuStudio:3mfVersion": BBS_3MF_VERSION,
        "Copyright": "", "CreationDate": today, "Description": "", "Designer": "", "DesignerCover": "",
        "DesignerUserId": "", "License": "", "ModificationDate": today, "Origin": "",
        "ProfileCover": "", "ProfileDescription": "", "ProfileTitle": "", "Title": project_name,
    }
    if has_thumb:
        meta["Thumbnail_Middle"] = "/Metadata/plate_1.png"
        meta["Thumbnail_Small"] = "/Metadata/plate_1_small.png"
    root = ['<?xml version="1.0" encoding="UTF-8"?>\n', _MODEL_NS]
    for k in sorted(meta):        # std::map<std::string,std::string> metadata_item_map
        root.append(f' <metadata name="{k}">{_xml_escape(meta[k])}</metadata>\n')
    root.append(" <resources>\n")
    for o in objects:
        root.append(f'  <object id="{o["obj_id"]}" p:UUID="{_uuid(o["backup_id"], OBJECT_UUID_SUFFIX)}" type="model">\n')
        root.append("   <components>\n")
        path = f"/3D/Objects/object_{o['backup_id']}.model"
        for idx, (vid, pp) in enumerate(zip(o["vol_ids"], o["parts"])):
            c = pp["center"]
            root.append(f'    <component p:path="{path}" objectid="{vid}" '
                        f'p:UUID="{_uuid(idx + (o["backup_id"] << 16), COMPONENT_UUID_SUFFIX)}" '
                        f'transform="{_transform_3mf(*c)}"/>\n')
        root.append("   </components>\n  </object>\n")
    root.append(" </resources>\n")
    root.append(f' <build p:UUID="{BUILD_UUID}">\n')
    for o in objects:
        root.append(f'  <item objectid="{o["obj_id"]}" p:UUID="{_uuid(o["obj_id"], BUILD_UUID_SUFFIX)}" '
                    f'transform="{_transform_3mf(*o["world"])}" printable="1"/>\n')
    root.append(" </build>\n</model>\n")
    files.append(("3D/3dmodel.model", "".join(root).encode("utf-8"), True))

    # 3D/_rels/3dmodel.model.rels
    rels = ['<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n']
    for i, o in enumerate(objects):
        rels.append(f' <Relationship Target="/3D/Objects/object_{o["backup_id"]}.model" Id="rel-{i + 1}" '
                    f'Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>\n')
    rels.append("</Relationships>")
    files.append(("3D/_rels/3dmodel.model.rels", "".join(rels).encode(), True))

    # 3D/Objects/object_N.model (one mesh object per volume; type model|other)
    for o in objects:
        sub = ['<?xml version="1.0" encoding="UTF-8"?>\n', _MODEL_NS,
               f' <metadata name="BambuStudio:3mfVersion">{BBS_3MF_VERSION}</metadata>\n', " <resources>\n"]
        for idx, (vid, pp) in enumerate(zip(o["vol_ids"], o["parts"])):
            typ = "model" if pp["sub"] == "normal_part" else "other"
            sub.append(f'  <object id="{vid}" p:UUID="{_uuid(idx + (o["backup_id"] << 16), SUB_OBJECT_UUID_SUFFIX)}" type="{typ}">\n')
            sub.append(_mesh_xml(pp["verts"], pp["faces"]))
            sub.append("  </object>\n")
        sub.append(" </resources>\n <build/>\n</model>\n")
        files.append((f"3D/Objects/object_{o['backup_id']}.model", "".join(sub).encode("utf-8"), True))

    # Metadata/project_settings.config
    wt = [pl.get("wipe_tower") for pl in plates]
    ps = build_project_settings(filaments, process_overrides, n_plates, wt, bed_type=bed_type,
                                app_version=app_version, ams_count=ams_count, base=base)
    files.append(("Metadata/project_settings.config", (json.dumps(ps, indent=4, ensure_ascii=False) + "\n").encode("utf-8"), True))

    # Metadata/model_settings.config
    src_file = os.path.basename(out_path)
    ms = ['<?xml version="1.0" encoding="UTF-8"?>\n<config>\n']
    for o_index, o in enumerate(objects):
        src = o["src"]
        ms.append(f'  <object id="{o["obj_id"]}">\n')
        ms.append(f'    <metadata key="name" value="{_xml_escape(src.get("name", "Object"))}"/>\n')
        for k, v in _object_settings_xml(base, src.get("settings") or {}, o["extruder"]):
            ms.append(f'    <metadata key="{k}" value="{_xml_escape(v)}"/>\n')
        face_count = sum(len(pp["faces"]) for pp in o["parts"] if pp["sub"] == "normal_part")
        ms.append(f'    <metadata face_count="{face_count}"/>\n')
        for v_index, (vid, pp) in enumerate(zip(o["vol_ids"], o["parts"])):
            part = pp["part"]
            c = pp["center"]
            ms.append(f'    <part id="{vid}" subtype="{pp["sub"]}">\n')
            ms.append(f'      <metadata key="name" value="{_xml_escape(part.get("name", src.get("name", "Part")))}"/>\n')
            ms.append(f'      <metadata key="matrix" value="{_matrix_4x4(*c)}"/>\n')
            if pp["sub"] == "normal_part":
                ms.append(f'      <metadata key="source_file" value="{_xml_escape(src_file)}"/>\n')
                ms.append(f'      <metadata key="source_object_id" value="{o_index}"/>\n')
                ms.append(f'      <metadata key="source_volume_id" value="{v_index}"/>\n')
                # the mesh stored in this file is already centred, so the centring shift
                # (ModelVolume::source.mesh_offset) of this source is zero
                ms.append('      <metadata key="source_offset_x" value="0"/>\n')
                ms.append('      <metadata key="source_offset_y" value="0"/>\n')
                ms.append('      <metadata key="source_offset_z" value="0"/>\n')
            vol_cfg = {}
            if pp["ext"] > 0 and pp["sub"] in ("normal_part", "modifier_part"):
                vol_cfg["extruder"] = str(pp["ext"])
            for k, v in (part.get("settings") or {}).items():
                vol_cfg[k] = dict(_object_settings_xml(base, {k: v}, 0))[k]
            for k in sorted(vol_cfg):
                ms.append(f'      <metadata key="{k}" value="{_xml_escape(vol_cfg[k])}"/>\n')
            ms.append(f'      <mesh_stat face_count="{len(pp["faces"])}" edges_fixed="0" degenerate_facets="0" '
                      f'facets_removed="0" facets_reversed="0" backwards_edges="0"/>\n')
            ms.append("    </part>\n")
        ms.append("  </object>\n")
    for p_idx, plate in enumerate(plates):
        ms.append("  <plate>\n")
        ms.append(f'    <metadata key="plater_id" value="{p_idx + 1}"/>\n')
        ms.append(f'    <metadata key="plater_name" value="{_xml_escape(plate.get("name", ""))}"/>\n')
        ms.append(f'    <metadata key="locked" value="{"true" if plate.get("locked") else "false"}"/>\n')
        for k in ("thumbnail_file", "thumbnail_no_light_file", "top_file", "pick_file"):
            if k in plate_thumbs.get(p_idx, {}):
                ms.append(f'    <metadata key="{k}" value="{plate_thumbs[p_idx][k]}"/>\n')
        for o in objects:
            if o["plate"] != p_idx:
                continue
            ms.append("    <model_instance>\n")
            ms.append(f'      <metadata key="object_id" value="{o["obj_id"]}"/>\n')
            ms.append('      <metadata key="instance_id" value="0"/>\n')
            ms.append(f'      <metadata key="identify_id" value="{o["identify_id"]}"/>\n')
            ms.append("    </model_instance>\n")
        ms.append("  </plate>\n")
    ms.append("  <assemble>\n  </assemble>\n</config>\n")
    files.append(("Metadata/model_settings.config", "".join(ms).encode("utf-8"), True))

    # Metadata/cut_information.xml (1-based object index, fresh cut ids)
    cut = ['<?xml version="1.0" encoding="utf-8"?>\n<objects>\n']
    for i in range(len(objects)):
        cut.append(f' <object id="{i + 1}">\n  <cut_id id="0" check_sum="1" connectors_cnt="0"/>\n </object>\n')
    cut.append("</objects>\n")
    files.append(("Metadata/cut_information.xml", "".join(cut).encode(), True))

    # Metadata/slice_info.config (header only - nothing sliced)
    files.append(("Metadata/slice_info.config", (
        '<?xml version="1.0" encoding="UTF-8"?>\n<config>\n  <header>\n'
        '    <header_item key="X-BBL-Client-Type" value="slicer"/>\n'
        f'    <header_item key="X-BBL-Client-Version" value="{app_version}"/>\n'
        '  </header>\n</config>\n').encode(), True))

    # Metadata/filament_sequence.json (empty sequences per plate, as an unsliced 2.x save)
    seq = {f"plate_{i + 1}": {"nozzle_sequence": [], "optimal_assignment": [], "sequence": []} for i in range(n_plates)}
    files.append(("Metadata/filament_sequence.json", json.dumps(seq, separators=(",", ":")).encode(), True))

    # _rels/.rels
    r = ['<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n',
         ' <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>\n']
    if has_thumb:
        r.append(' <Relationship Target="/Metadata/plate_1.png" Id="rel-2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail"/>\n')
        r.append(' <Relationship Target="/Metadata/plate_1.png" Id="rel-4" Type="http://schemas.bambulab.com/package/2021/cover-thumbnail-middle"/>\n')
        r.append('<Relationship Target="/Metadata/plate_1_small.png" Id="rel-5" Type="http://schemas.bambulab.com/package/2021/cover-thumbnail-small"/>\n')
    r.append("</Relationships>")
    files.append(("_rels/.rels", "".join(r).encode(), True))

    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    tmp = out_path + ".tmp"
    with zipfile.ZipFile(tmp, "w") as z:
        for name, data, compress in files:
            zi = zipfile.ZipInfo(name, date_time=_dt.datetime.now().timetuple()[:6])
            zi.compress_type = zipfile.ZIP_DEFLATED if compress else zipfile.ZIP_STORED
            zi.external_attr = 0o644 << 16
            z.writestr(zi, data)
    os.replace(tmp, out_path)

    return {
        "path": out_path, "app_version": app_version, "bed": (bw, bd), "plate_count": n_plates,
        "plate_origins": [plate_origin(i, n_plates, bw, bd) for i in range(n_plates)],
        "objects": [dict(name=o["src"].get("name"), plate=o["plate"] + 1, object_id=o["obj_id"],
                         volume_ids=o["vol_ids"], world=o["world"], identify_id=o["identify_id"]) for o in objects],
        "different_settings_to_system": ps.get("different_settings_to_system"),
    }


if __name__ == "__main__":
    import sys
    if len(sys.argv) >= 2 and sys.argv[1] == "--rebuild-base":
        b = build_base(sys.argv[2] if len(sys.argv) > 2 else DEFAULT_BBS_ROOT)
        print("rebuilt", BASE_CACHE, "from BambuStudio", b["bambustudio_source_version"], "profiles", b["profiles_version"])
    else:
        print(__doc__)
