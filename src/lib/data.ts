// Imports removed since they are no longer used directly in the data definition
// import { Heart, BookOpen, Users, School } from "lucide-react";

export const NAV_LINKS = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About Us" },
    { href: "/projects", label: "Projects" },
    { href: "/public-track", label: "Public Track" },
    { href: "/contact", label: "Contact" },
];

export const IMPACT_STATS = [
    { label: "Children Supported", value: 1200, icon: "Users" },
    { label: "Schools Built", value: 15, icon: "School" },
    { label: "Scholarships Given", value: 350, icon: "BookOpen" },
    { label: "Donations Received", value: "50k+", icon: "Heart" },
];

export const PROJECTS = [
    {
        id: "1",
        title: "Education for Street Children",
        description: "Providing basic education and school supplies to children living on the streets of Dhaka.",
        image: "/images/project-1.jpg", // Placeholder
        goal: 5000,
        raised: 3200,
        slug: "education-for-street-children",
    },
    {
        id: "2",
        title: "Winter Clothes Distribution",
        description: "Distributing warm clothes and blankets to poor families in northern Bangladesh.",
        image: "/images/project-2.jpg", // Placeholder
        goal: 2000,
        raised: 1800,
        slug: "winter-clothes-distribution",
    },
    {
        id: "3",
        title: "Flood Relief Program",
        description: "Emergency food and medicine supply for flood-affected areas.",
        image: "/images/project-3.jpg", // Placeholder
        goal: 10000,
        raised: 4500,
        slug: "flood-relief-program",
    },
];

export const TESTIMONIALS = [
    {
        id: "1",
        name: "Ahmed Rahman",
        role: "Donor",
        content: "I have seen their work firsthand. Rangdhanu is making a real difference in these children's lives.",
        avatar: "/images/avatar-1.jpg",
    },
    {
        id: "2",
        name: "Sarah Khan",
        role: "Volunteer",
        content: "Volunteering with Rangdhanu has been a life-changing experience. The transparency they maintain is commendable.",
        avatar: "/images/avatar-2.jpg",
    },
];

export const TEAM_MEMBERS = [
    {
        id: "1",
        name: "Rafiqul Islam",
        role: "Founder & Chairman",
        image: "/images/team-1.jpg",
    },
    {
        id: "2",
        name: "Nusrat Jahan",
        role: "Program Director",
        image: "/images/team-2.jpg",
    },
    {
        id: "3",
        name: "Tanvir Hasan",
        role: "Finance Manager",
        image: "/images/team-3.jpg",
    },
];
