import { MetadataRoute } from "next";
import { PROJECTS } from "@/lib/data";

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = "https://rangdhanu-charity.org"; // Placeholder domain

    const projectUrls = PROJECTS.map((project) => ({
        url: `${baseUrl}/projects/${project.id}`,
        lastModified: new Date(),
    }));

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
        },
        {
            url: `${baseUrl}/about`,
            lastModified: new Date(),
        },
        {
            url: `${baseUrl}/projects`,
            lastModified: new Date(),
        },
        {
            url: `${baseUrl}/donate`,
            lastModified: new Date(),
        },
        {
            url: `${baseUrl}/volunteer`,
            lastModified: new Date(),
        },
        {
            url: `${baseUrl}/transparency`,
            lastModified: new Date(),
        },
        {
            url: `${baseUrl}/contact`,
            lastModified: new Date(),
        },
        ...projectUrls,
    ];
}
