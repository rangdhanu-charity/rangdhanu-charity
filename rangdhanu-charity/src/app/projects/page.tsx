import { ProjectList } from "@/components/sections/project-list";
import { Section } from "@/components/layout/section";

export default function ProjectsPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <section className="bg-muted py-12 text-center">
                <div className="container px-4">
                    <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Our Projects</h1>
                    <p className="mx-auto mt-4 max-w-[700px] text-muted-foreground">
                        Explore our active projects and see how your contribution can make a difference.
                    </p>
                </div>
            </section>

            <Section>
                <ProjectList />
            </Section>
        </div>
    );
}
