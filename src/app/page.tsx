import { Button } from "@/components/ui/button";
import { Section } from "@/components/layout/section";
import { HomeFeaturedProjects } from "@/components/sections/home-featured-projects";
import { HomeTestimonials } from "@/components/sections/home-testimonials";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, CheckCircle, Heart, CreditCard, CalendarCheck, Landmark } from "lucide-react";
import Link from "next/link";
import { HomeDonateModal } from "@/components/features/donations/home-donate-modal";
import { HomeHeroGallery } from "@/components/sections/home-hero-gallery";
import { PublicBanner } from "@/components/sections/public-banner";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicBanner />

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden py-24 md:py-36 lg:py-56">
        <HomeHeroGallery />
        <div className="container relative z-20 px-4 text-center md:px-6">
          <div className="mx-auto max-w-3xl space-y-4 bg-white/20 dark:bg-black/20 backdrop-blur-sm p-6 sm:p-10 rounded-3xl border border-white/30 dark:border-white/10 shadow-xl">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl bg-gradient-to-r from-blue-800 via-blue-600 to-teal-600 dark:from-blue-400 dark:via-blue-300 dark:to-teal-300 bg-clip-text text-transparent animate-gradient drop-shadow-sm">
              Empowering Future Generations
            </h1>
            <p className="mx-auto max-w-[700px] text-slate-900 dark:text-slate-100 font-medium md:text-xl/relaxed lg:text-lg/relaxed xl:text-xl/relaxed drop-shadow-sm">
              Rangdhanu Charity Foundation supports underprivileged children to continue their education and build a brighter future.
            </p>
          </div>
          <div className="mx-auto mt-8 flex max-w-sm flex-col gap-4 sm:flex-row sm:justify-center">
            <HomeDonateModal>
              <Button size="lg" className="group bg-gradient-to-r from-blue-600 to-pink-500 hover:scale-105 hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] transition-all duration-300 ease-out border border-white/10">
                Donate Now <Heart className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:scale-125 group-hover:text-pink-200" />
              </Button>
            </HomeDonateModal>
            <Button asChild variant="outline" size="lg" className="hover:scale-105 transition-all duration-300">
              <Link href="/register">
                Become a member <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Donation Plans & Procedures */}
      <section className="py-20 bg-muted/30">
        <div className="container px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Our Donation Plans</h2>
            <p className="text-muted-foreground text-lg">
              We offer two easy ways to support our cause. Whether you want to commit long-term or make a one-time contribution, every bit helps us reach our goal.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Monthly Membership */}
            <Card className="relative overflow-hidden border-t-4 border-t-blue-500 shadow-md">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <CalendarCheck className="w-32 h-32" />
              </div>
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                  <CalendarCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-2xl">Monthly Membership</CardTitle>
                <CardDescription className="text-base text-foreground/80 mt-2">
                  For our registered members who want to build a sustainable future with consistent impact.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Minimum contribution of <strong>100 BDT</strong> each month.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>General deadline is by the <strong>10th</strong> of each month.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Highly flexible: pay anytime for a single month or bulk pay for multiple months ahead!</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* One-Time Donation */}
            <Card className="relative overflow-hidden border-t-4 border-t-pink-500 shadow-md">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <Heart className="w-32 h-32" />
              </div>
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mb-4">
                  <Heart className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                </div>
                <CardTitle className="text-2xl">One-Time Donation</CardTitle>
                <CardDescription className="text-base text-foreground/80 mt-2">
                  Open for everyone. Immediate support from the general public with zero constraints.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Open to non-members and the general public. No account needed.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Donate any amount you wish safely and securely.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Submit your transfer details directly via the "Donate Now" button.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Payment Methods */}
          <div className="mt-16 max-w-4xl mx-auto">
            <h3 className="text-xl font-bold text-center mb-8">Accepted Payment Methods</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-white dark:bg-card flex flex-col items-center justify-center p-6 text-center shadow-sm">
                <div className="mb-3 p-3 bg-pink-100 dark:bg-pink-900/20 rounded-full">
                  <CreditCard className="h-6 w-6 text-pink-600" />
                </div>
                <h4 className="font-semibold text-lg">bKash / Nagad</h4>
                <p className="text-sm text-muted-foreground mt-1">+880 1829-965153</p>
                <p className="text-xs text-muted-foreground mt-1 cursor-default">(Mohammad Ful Mia)</p>
              </Card>
              <Card className="bg-white dark:bg-card flex flex-col items-center justify-center p-6 text-center shadow-sm">
                <div className="mb-3 p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                  <Landmark className="h-6 w-6 text-orange-600" />
                </div>
                <h4 className="font-semibold text-lg">Dutch Bangla</h4>
                <p className="text-sm text-muted-foreground mt-1">2261510170962</p>
                <p className="text-xs text-muted-foreground mt-1 cursor-default">Account Name: Mohammad Ful Mia</p>
              </Card>
              <Card className="bg-white dark:bg-card flex flex-col items-center justify-center p-6 text-center shadow-sm">
                <div className="mb-3 p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                  <Heart className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="font-semibold text-lg">Cash</h4>
                <p className="text-sm text-muted-foreground mt-1">In Person</p>
                <p className="text-xs text-muted-foreground mt-1 cursor-default">Directly to Administration</p>
              </Card>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                Once you transfer the amount, please fill out the payment information using the <strong>Donate Now</strong> button above. If you prefer to drop off cash or wish to confirm verbally, simply contact our admins.
              </p>
            </div>

            {/* Detailed Donation Guide */}
            <div className="mt-16 max-w-4xl mx-auto bg-blue-50/50 dark:bg-blue-950/20 p-6 md:p-8 rounded-xl border border-blue-100 dark:border-blue-900/50">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-blue-900 dark:text-blue-100">
                <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                How to Successfully Send Your Donation
              </h3>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg text-foreground">Transfer Your Donation</h4>
                    <p className="text-muted-foreground text-sm mt-1 mb-2">
                      First, send your donation to one of the following accounts:
                    </p>
                    <ul className="text-sm space-y-2 text-muted-foreground bg-white dark:bg-card p-4 rounded-lg border shadow-sm">
                      <li className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-primary" /> <strong className="text-foreground">bKash/Nagad:</strong> +880 1829-965153 (Mohammad Ful Mia)</li>
                      <li className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-primary" /> <strong className="text-foreground">Dutch Bangla:</strong> 2261510170962</li>
                      <li className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-primary" /> <strong className="text-foreground">Cash:</strong> In Person</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg text-foreground">Fill out the "Donate Now" Form</h4>
                    <p className="text-muted-foreground text-sm mt-1">
                      After transferring, securely log your donation using the <strong className="text-foreground">"Donate Now"</strong> button at the top of the page. Fill in all the requested details and click <strong className="text-foreground">"Submit Donation Transfer"</strong>. Our team will verify the transaction against our account records.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg text-foreground">Track Your Donation</h4>
                    <p className="text-muted-foreground text-sm mt-1">
                      You can track the live status (Pending, Approved, or Rejected) of your donation payment in the <strong className="text-foreground text-blue-600 dark:text-blue-400">Public Track</strong> tab in the navigation menu. Members can also view their history directly in their profile dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Projects */}
      <HomeFeaturedProjects />

      {/* Testimonials */}
      <HomeTestimonials />


    </div>
  );
}
