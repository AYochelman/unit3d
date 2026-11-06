import Link from "next/link";
import Image from "next/image";
import { assetSrc } from "@/lib/assets";
import Icon from "@/components/ui/Icon";

/**
 * The 3D name keychain, shown off on the home page. A still here, not the live
 * model: three.js is heavy for a page everyone opens, and the picture is one
 * click from the real thing in the designer.
 */
export default function NameKeychainTeaser() {
  return (
    <section className="max-w-7xl mx-auto px-6 md:px-10 py-14 md:py-20">
      <Link
        href="/configurator?product=name_keychain"
        className="group grid md:grid-cols-2 items-center gap-6 md:gap-10 rounded-3xl border border-ink-800 bg-[radial-gradient(circle_at_30%_40%,#123a26,#06150e_70%)] p-6 md:p-10 hover:border-flame/60 transition-colors"
      >
        <div className="order-2 md:order-1">
          <div className="font-mono text-[11px] tracking-widest text-flame mb-3">חדש · תלת-מימד חי</div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tightest leading-heading mb-3">
            כותבים שם.
            <br />
            <span className="text-flame">רואים אותו בתלת-מימד.</span>
          </h2>
          <p className="text-ink-300 md:text-lg max-w-md mb-6">
            5 סטיילים, עד שני צבעים. המחזיק נבנה מול העיניים, ואפשר לסובב אותו ולראות אותו מכל צד לפני שמזמינים.
          </p>
          <span className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-flame-600 text-white font-bold group-hover:bg-flame transition-colors">
            לנסות עם השם שלך
            <Icon name="arrowLeft" size={16} />
          </span>
        </div>
        <div className="order-1 md:order-2 relative aspect-[5/4] max-w-md w-full mx-auto">
          <Image src={assetSrc("/img/products/name-keychain-3d.webp")} alt="מחזיק מפתחות עם שם בתלת-מימד" fill sizes="(max-width: 768px) 90vw, 448px" className="object-contain group-hover:scale-[1.03] transition-transform duration-500" unoptimized />
        </div>
      </Link>
    </section>
  );
}
