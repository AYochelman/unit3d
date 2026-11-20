"""Compact STEP AP214 writer: one FACETED_BREP solid per part (exact print triangles, mm).
Verified by reading it back with OpenCascade (see verify_step)."""
import datetime


def _f(v):
    s = "%.6f" % v
    s = s.rstrip("0")
    return s + "0" if s.endswith(".") else s


def write_faceted_step(items, path, title="UNIT3D mascot"):
    """items: list of (name, vertices (N,3), faces (M,3))."""
    L = []
    n = [0]

    def add(txt):
        n[0] += 1
        L.append(f"#{n[0]}={txt};")
        return n[0]

    ctx_app = add("APPLICATION_CONTEXT('automotive design')")
    add(f"APPLICATION_PROTOCOL_DEFINITION('international standard','automotive_design',2000,#{ctx_app})")
    u_len = add("(LENGTH_UNIT()NAMED_UNIT(*)SI_UNIT(.MILLI.,.METRE.))")
    u_ang = add("(NAMED_UNIT(*)PLANE_ANGLE_UNIT()SI_UNIT($,.RADIAN.))")
    u_sol = add("(NAMED_UNIT(*)SI_UNIT($,.STERADIAN.)SOLID_ANGLE_UNIT())")
    unc = add(f"UNCERTAINTY_MEASURE_WITH_UNIT(LENGTH_MEASURE(1.E-05),#{u_len},'distance_accuracy_value','confusion accuracy')")
    gctx = add(f"(GEOMETRIC_REPRESENTATION_CONTEXT(3)GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT((#{unc}))"
               f"GLOBAL_UNIT_ASSIGNED_CONTEXT((#{u_len},#{u_ang},#{u_sol}))REPRESENTATION_CONTEXT('3D',''))")
    pctx = add(f"PRODUCT_CONTEXT('',#{ctx_app},'mechanical')")
    pdctx = add(f"PRODUCT_DEFINITION_CONTEXT('part definition',#{ctx_app},'design')")
    o = add("CARTESIAN_POINT('',(0.,0.,0.))")
    dz = add("DIRECTION('',(0.,0.,1.))")
    dx = add("DIRECTION('',(1.,0.,0.))")
    ax = add(f"AXIS2_PLACEMENT_3D('',#{o},#{dz},#{dx})")
    for name, verts, faces in items:
        nm = name.replace("'", "")
        prod = add(f"PRODUCT('{nm}','{nm}','',(#{pctx}))")
        add(f"PRODUCT_RELATED_PRODUCT_CATEGORY('part',$,(#{prod}))")
        pdf = add(f"PRODUCT_DEFINITION_FORMATION('','',#{prod})")
        pd = add(f"PRODUCT_DEFINITION('design','',#{pdf},#{pdctx})")
        pds = add(f"PRODUCT_DEFINITION_SHAPE('','',#{pd})")
        p0 = n[0] + 1
        for x, y, z in verts:
            add(f"CARTESIAN_POINT('',({_f(x)},{_f(y)},{_f(z)}))")
        fids = []
        import numpy as _np
        V = _np.asarray(verts, float)
        for a, b, c in faces:
            e1 = V[b] - V[a]; e2 = V[c] - V[a]
            nrm = _np.cross(e1, e2); ln = _np.linalg.norm(nrm)
            if ln < 1e-12 or _np.linalg.norm(e1) < 1e-12:
                continue
            nrm /= ln; rd = e1 / _np.linalg.norm(e1)
            dn = add(f"DIRECTION('',({_f(nrm[0])},{_f(nrm[1])},{_f(nrm[2])}))")
            dr = add(f"DIRECTION('',({_f(rd[0])},{_f(rd[1])},{_f(rd[2])}))")
            a2 = add(f"AXIS2_PLACEMENT_3D('',#{p0 + a},#{dn},#{dr})")
            pl = add(f"PLANE('',#{a2})")
            lp = add(f"POLY_LOOP('',(#{p0 + a},#{p0 + b},#{p0 + c}))")
            bd = add(f"FACE_OUTER_BOUND('',#{lp},.T.)")
            fids.append(add(f"FACE_SURFACE('',(#{bd}),#{pl},.T.)"))
        shell = add("CLOSED_SHELL('',(" + ",".join(f"#{i}" for i in fids) + "))")
        fb = add(f"FACETED_BREP('{nm}',#{shell})")
        rep = add(f"FACETED_BREP_SHAPE_REPRESENTATION('{nm}',(#{fb},#{ax}),#{gctx})")
        add(f"SHAPE_DEFINITION_REPRESENTATION(#{pds},#{rep})")
    now = datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    head = ["ISO-10303-21;", "HEADER;", f"FILE_DESCRIPTION(('{title} - faceted B-rep, one solid per part'),'2;1');",
            f"FILE_NAME('{path.split('/')[-1]}','{now}',(''),(''),'UNIT3D generator','UNIT3D generator','');",
            "FILE_SCHEMA(('AUTOMOTIVE_DESIGN { 1 0 10303 214 1 1 1 1 }'));", "ENDSEC;", "DATA;"]
    with open(path, "w") as f:
        f.write("\n".join(head + L + ["ENDSEC;", "END-ISO-10303-21;", ""]))


def verify_step(path):
    """Read back with OpenCascade: number of solids, validity, volumes."""
    from OCP.STEPControl import STEPControl_Reader
    from OCP.IFSelect import IFSelect_RetDone
    from OCP.TopExp import TopExp_Explorer
    from OCP.TopAbs import TopAbs_SOLID, TopAbs_SHELL
    from OCP.BRepCheck import BRepCheck_Analyzer
    from OCP.GProp import GProp_GProps
    from OCP.BRepGProp import BRepGProp
    r = STEPControl_Reader()
    assert r.ReadFile(path) == IFSelect_RetDone
    r.TransferRoots()
    sh = r.OneShape()
    out = []
    for kind in (TopAbs_SOLID,):
        e = TopExp_Explorer(sh, kind)
        while e.More():
            s = e.Current()
            p = GProp_GProps()
            BRepGProp.VolumeProperties_s(s, p)
            out.append({"valid": bool(BRepCheck_Analyzer(s).IsValid()), "volume_mm3": round(abs(p.Mass()), 2)})
            e.Next()
    if not out:   # some readers return shells for faceted breps
        e = TopExp_Explorer(sh, TopAbs_SHELL)
        while e.More():
            out.append({"shell": True})
            e.Next()
    return out
