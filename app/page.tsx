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
      {/* Social proof before anything else — it is the first question a new
          visitor has, and it used to sit at the bottom of the page. */}
      <ReviewsRow />
      <AudienceSwitcher />
      <Categories />
      <ProductShowcase />
      <HowItWorks />
      <LivePreview />
      <Marquee />
      <B2BBlock />
      <FinalCTA />
    </>
  );
}
