import { TestimonialsGrid } from "./components/testimonials-grid";
import { PublicBanner } from "@/components/sections/public-banner";

export const metadata = {
    title: "Voices of Change - Rangdhanu Charity Foundation",
    description: "Read inspiring stories and experiences from our members, donors, and the community we serve.",
};

export default function TestimonialsPage() {
    return (
        <main className="min-h-screen">
            <PublicBanner />

            {/* Header Section */}
            <section className="bg-muted py-16 md:py-24">
                <div className="container px-4 text-center">
                    <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl text-primary mb-6">
                        Voices of Change
                    </h1>
                    <p className="mx-auto max-w-[700px] text-lg text-muted-foreground">
                        Our members and donors are the heartbeat of Rangdhanu Charity Foundation.
                        Read their stories, experiences, and why they choose to be a part of our mission.
                    </p>
                </div>
            </section>

            {/* Testimonials Grid Section */}
            <section className="py-12 md:py-20 container px-4">
                <TestimonialsGrid />
            </section>
        </main>
    );
}
