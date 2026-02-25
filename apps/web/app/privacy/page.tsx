'use client';

import Link from 'next/link';

export default function PrivacyPage() {
    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Last updated: February 25, 2026
                </p>
            </div>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">The Short Version</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    We collect your information only with your consent; we only collect the minimum amount of
                    personal information necessary to fulfill the purpose of your interaction with us; we
                    don&apos;t sell it to third parties; and we only use it as this Privacy Policy describes.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">What Information AllianceOps Collects and Why</h2>

                <div className="space-y-3">
                    <h3 className="text-lg font-medium">Information from Website Browsers</h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        If you&apos;re just browsing the website, we collect the same basic information that most
                        websites collect. We use common internet technologies, such as cookies and web server
                        logs. The information we collect includes the visitor&apos;s browser type, language
                        preference, referring site, and the date and time of each visitor request. We also
                        collect potentially personally-identifying information like Internet Protocol (IP)
                        addresses.
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        We collect this information to better understand how our website visitors use
                        AllianceOps, and to monitor and protect the security of the website.
                    </p>
                </div>

                <div className="space-y-3">
                    <h3 className="text-lg font-medium">Information from Users with Accounts</h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        AllianceOps uses third-party sign-in providers for authentication. When you create an
                        account, we receive your name and email address from your sign-in provider. We do not
                        receive or store your password.
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        We use this information to:
                    </p>
                    <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1 ml-2">
                        <li>Identify you across devices for a consistent experience</li>
                        <li>Personalize your experience (e.g., displaying your name)</li>
                        <li>Associate you with your FRC team for team-scoped features</li>
                    </ul>
                </div>

                <div className="space-y-3">
                    <h3 className="text-lg font-medium">FRC Data from Third-Party APIs</h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        AllianceOps retrieves publicly available FRC competition data from{' '}
                        <a
                            href="https://www.thebluealliance.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                            The Blue Alliance
                        </a>{' '}
                        and{' '}
                        <a
                            href="https://www.statbotics.io"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                            Statbotics
                        </a>
                        . This data includes team numbers, match scores, rankings, and performance statistics.
                        This is publicly available information and is not personally identifiable.
                    </p>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">What Information AllianceOps Does Not Collect</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    We do not intentionally collect sensitive personal information, such as social security
                    numbers, genetic data, health information, or religious information. If you are a child
                    under the age of 13, you may not have an account on AllianceOps. AllianceOps does not
                    knowingly collect information from or direct any of our content specifically to children
                    under 13. If we learn or have reason to suspect that you are a user who is under the age
                    of 13, we will close your account.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">How We Share the Information We Collect</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    We do not share, sell, rent, or trade any User Personal Information with third parties.
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    Your team membership and role within AllianceOps is visible to other members of the same
                    team. Strategy data (picklists, duty plans, match briefings) is scoped to your team and
                    only accessible by team members.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">Our Use of Cookies and Tracking</h2>

                <div className="space-y-3">
                    <h3 className="text-lg font-medium">Cookies</h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        AllianceOps uses cookies to make interactions with our service easy and meaningful. We
                        use cookies and similar technologies (like localStorage) to keep you logged in and
                        remember your preferences, such as your selected event and year.
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        The cookies AllianceOps sets are essential for the operation of the website. By using our
                        website, you agree that we can place these types of cookies on your computer or device.
                        If you disable your browser&apos;s ability to accept cookies, you will not be able to
                        log in or use AllianceOps&apos;s services.
                    </p>
                </div>

                <div className="space-y-3">
                    <h3 className="text-lg font-medium">Application Insights</h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        We use Azure Application Insights for performance monitoring and error tracking. This
                        service collects anonymized telemetry data such as page load times, error rates, and
                        general usage patterns. We do not use this data to track individual users or correlate
                        it with your personal information.
                    </p>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">Data Storage and Security</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    AllianceOps is hosted on Microsoft Azure. Your data is stored in Azure-managed databases
                    and protected by industry-standard security measures. We use HTTPS encryption for all data
                    in transit and Azure&apos;s built-in encryption for data at rest. API keys and secrets are
                    stored in Azure Key Vault and are never exposed in source code or client-side applications.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">Changes to This Policy</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    Although most changes are likely to be minor, AllianceOps may change this Privacy Policy
                    from time to time. We will provide notification of material changes through our website.
                    Continued use of the website after changes constitutes acceptance of the updated policy.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">License</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    This Privacy Policy is adapted from{' '}
                    <a
                        href="https://www.thebluealliance.com/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                        The Blue Alliance&apos;s Privacy Policy
                    </a>
                    , which itself is adapted from{' '}
                    <a
                        href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                        GitHub&apos;s Privacy Statement
                    </a>
                    , and is licensed under the{' '}
                    <a
                        href="https://creativecommons.org/licenses/by/4.0/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                        Creative Commons Attribution license
                    </a>
                    . You may use it freely under the terms of the Creative Commons license.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">Contact</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    If you have questions regarding this Privacy Policy, please{' '}
                    <a
                        href="https://github.com/o-bots7160/AllianceOps/issues"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                        open an issue on GitHub
                    </a>
                    .
                </p>
            </section>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <Link
                    href="/"
                    className="text-sm underline text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                    &larr; Back to home
                </Link>
            </div>
        </div>
    );
}
