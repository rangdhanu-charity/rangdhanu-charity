import Link from "next/link";
import { Facebook, Instagram, Twitter, Mail, MapPin, Phone, Heart } from "lucide-react";

export function Footer() {
    return (
        <footer className="w-full border-t bg-background">
            <div className="container px-4 py-12 md:py-24 lg:py-32">
                <div className="grid gap-8 lg:grid-cols-4 md:grid-cols-2">
                    <div className="flex flex-col gap-4">
                        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
                            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 via-purple-500 to-pink-500 text-white">
                                <Heart className="h-5 w-5 fill-current" />
                            </div>
                            <span className="bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
                                Rangdhanu
                            </span>
                        </Link>
                        <p className="text-sm text-muted-foreground">
                            Empowering underprivileged children through education and support.
                            Join us in making a difference.
                        </p>
                    </div>
                    <div className="flex flex-col gap-4">
                        <h3 className="font-semibold text-foreground">Quick Links</h3>
                        <Link href="/about" className="text-sm text-muted-foreground hover:text-primary">
                            About Us
                        </Link>
                        <Link href="/stories" className="text-sm text-muted-foreground hover:text-primary">
                            Stories
                        </Link>
                        <Link href="/projects" className="text-sm text-muted-foreground hover:text-primary">
                            Projects
                        </Link>
                        <Link href="/public-track" className="text-sm text-muted-foreground hover:text-primary">
                            Public Track
                        </Link>
                    </div>
                    <div className="flex flex-col gap-4">
                        <h3 className="font-semibold text-foreground">Contact</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4 shrink-0" />
                            <span>Meghna - 3515, Cumilla, Bangladesh</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4 shrink-0" />
                            <span>+880 1829-965153</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4 shrink-0" />
                            <span>info@rangdhanu.org</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-4">
                        <h3 className="font-semibold text-foreground">Follow Us</h3>
                        <div className="flex gap-4">
                            <Link href="#" className="text-muted-foreground hover:text-primary">
                                <Facebook className="h-5 w-5" />
                            </Link>
                            <Link href="#" className="text-muted-foreground hover:text-primary">
                                <Instagram className="h-5 w-5" />
                            </Link>
                            <Link href="#" className="text-muted-foreground hover:text-primary">
                                <Twitter className="h-5 w-5" />
                            </Link>
                        </div>
                        <div className="mt-4">
                            <p className="text-xs text-muted-foreground">Subscribe to our newsletter</p>
                            {/* Newsletter form placeholder */}
                            <form className="mt-2 flex gap-2">
                                <input type="email" placeholder="Email" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" />
                                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">Join</button>
                            </form>
                        </div>
                    </div>
                </div>
                <div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
                    © {new Date().getFullYear()} Rangdhanu Charity Foundation. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
