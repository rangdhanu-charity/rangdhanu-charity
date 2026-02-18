import { Button } from "@/components/ui/button";
import { Section } from "@/components/layout/section";
import { HomeFeaturedProjects } from "@/components/sections/home-featured-projects";
import { HomeTestimonials } from "@/components/sections/home-testimonials";
import { HomeImpactStats } from "@/components/sections/home-impact-stats";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PROJECTS } from "@/lib/data";
import { ArrowRight, CheckCircle, Heart } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden bg-background py-20 md:py-32 lg:py-48">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800" />
        <div className="container relative z-10 px-4 text-center md:px-6">
          <div className="mx-auto max-w-3xl space-y-4">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl bg-gradient-to-r from-blue-700 via-blue-500 to-teal-400 bg-clip-text text-transparent animate-gradient">
              Empowering Future Generations
            </h1>
            <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Rangdhanu Charity Foundation supports underprivileged children to continue their education and build a brighter future.
            </p>
          </div>
          <div className="mx-auto mt-8 flex max-w-sm flex-col gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-pink-500 hover:opacity-90 transition-opacity">
              <Link href="/donate">
                Donate Now <Heart className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/volunteer">
                Become a Volunteer <CheckCircle className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Impact Stats */}
      <HomeImpactStats />

      {/* Featured Projects */}
      <HomeFeaturedProjects />

      {/* Testimonials */}
      <HomeTestimonials />

      {/* Call to Action */}
      <section className="bg-primary text-primary-foreground py-16 md:py-24">
        <div className="container px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tighter md:text-4xl mb-6">Make a Difference Today</h2>
          <p className="max-w-[600px] mx-auto text-primary-foreground/80 mb-8 md:text-lg">
            Your contribution can change a child's life forever. Join our mission to build a better future.
          </p>
          <Button asChild size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
            <Link href="/donate">Donate Now</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
