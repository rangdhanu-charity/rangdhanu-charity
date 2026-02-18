import { Section } from "@/components/layout/section";

export default function PrivacyPolicyPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <section className="bg-muted py-12 text-center">
                <div className="container px-4">
                    <h1 className="text-3xl font-bold tracking-tighter">Privacy Policy</h1>
                    <p className="text-muted-foreground mt-2">Last updated: {new Date().toLocaleDateString()}</p>
                </div>
            </section>

            <Section>
                <div className="prose dark:prose-invert max-w-3xl mx-auto">
                    <h3>1. Introduction</h3>
                    <p>
                        Rangdhanu Charity Foundation ("we", "our", "us") respects your privacy and is committed to protecting the personal information you share with us.
                    </p>
                    <h3>2. Information We Collect</h3>
                    <p>
                        We may collect personal information such as your name, email address, phone number, and payment details when you donate, volunteer, or subscribe to our newsletter.
                    </p>
                    <h3>3. How We Use Your Information</h3>
                    <ul>
                        <li>To process donations and issue receipts.</li>
                        <li>To communicate with you about our projects and impact.</li>
                        <li>To improve our website and services.</li>
                    </ul>
                    <h3>4. Data Security</h3>
                    <p>
                        We implement security measures to maintain the safety of your personal information. We do not sell or trade your personal information to outside parties.
                    </p>
                    <h3>5. Contact Us</h3>
                    <p>
                        If you have any questions about this Privacy Policy, please contact us at info@rangdhanu.org.
                    </p>
                </div>
            </Section>
        </div>
    );
}
