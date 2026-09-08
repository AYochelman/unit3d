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

export default function HomePage() {
  return (
    <>
      <Hero />
      {/* The printer itself, straight after the hero. Eight timelapses off the
          real build plate answer "are these people actually printing?" before
          a visitor has to take anyone's word for it — the reviews then land on
          someone already half convinced. */}
      <LivePreview />
      <AudienceSwitcher />
      <Categories />
      <ProductShowcase />
      <HowItWorks />
      <ReviewsRow />
      <Marquee />
      <B2BBlock />
      <FinalCTA />
    </>
  );
}
