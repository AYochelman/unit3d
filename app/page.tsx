import Hero from "@/components/home/Hero";
import AudienceSwitcher from "@/components/home/AudienceSwitcher";
import Categories from "@/components/home/Categories";
import ProductShowcase from "@/components/home/ProductShowcase";
import HowItWorks from "@/components/home/HowItWorks";
import LivePreview from "@/components/home/LivePreview";
import Marquee from "@/components/home/Marquee";
import B2BBlock from "@/components/home/B2BBlock";
import ReviewsRow from "@/components/home/ReviewsRow";
import FinalCTA from "@/components/home/FinalCTA";
import JsonLd from "@/components/seo/JsonLd";
import { businessJsonLd, websiteJsonLd } from "@/lib/seo";
import Reveal from "@/components/ui/Reveal";

// The root's own address. The layout cannot declare it — metadata is
// inherited, and a canonical there would point all 408 pages here.
export const metadata = { alternates: { canonical: "/" } };

export default function HomePage() {
  return (
    <>
      {/* Who this business is, where it is and how to reach it — the block
          that lets a search for "הדפסת תלת מימד גבעתיים" find us at all. */}
      <JsonLd data={businessJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
      <Hero />
      {/* The printer itself, straight after the hero. Eight timelapses off the
          real build plate answer "are these people actually printing?" before
          a visitor has to take anyone's word for it — the reviews then land on
          someone already half convinced. */}
      <LivePreview />
      {/*
        Everything below the fold settles in as it is reached.
        Hero and LivePreview are deliberately NOT wrapped: they are on screen
        before a scroll happens, and fading in what someone is already looking
        at is a stutter, not an entrance.
      */}
      <Reveal><AudienceSwitcher /></Reveal>
      <Reveal><Categories /></Reveal>
      <Reveal><ProductShowcase /></Reveal>
      <Reveal><HowItWorks /></Reveal>
      <Reveal><ReviewsRow /></Reveal>
      <Reveal><Marquee /></Reveal>
      <Reveal><B2BBlock /></Reveal>
      <Reveal><FinalCTA /></Reveal>
    </>
  );
}
