import Btn from "@/components/ui/Btn";

export default function FinalCTA() {
  return (
    <section className="py-16 md:py-24 text-center">
      <div className="max-w-3xl mx-auto px-6 md:px-10">
        <h2 className="text-4xl md:text-6xl font-black tracking-tightest leading-[1.05]">
          יש לכם רעיון?
          <br />
          <span className="text-flame">אנחנו מוכנים להפוך אותו למציאות.</span>
        </h2>
        <p className="mt-5 text-ink-300 text-base md:text-lg max-w-xl mx-auto">
          מתחילים עכשיו — במעצב, בקטלוג, או פשוט שולחים לנו את הקובץ. חוזרים
          אליכם בוואטסאפ תוך שעה.
        </p>
        <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
          <Btn as="a" href="/trendy" size="lg" icon="sparkles">
            התחל להזמין
          </Btn>
          <Btn as="a" href="/contact" size="lg" variant="ghost" icon="whatsapp">
            דבר איתי
          </Btn>
        </div>
      </div>
    </section>
  );
}
