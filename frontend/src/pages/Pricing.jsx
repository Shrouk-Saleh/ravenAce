import { Link } from 'react-router-dom'

function Pricing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="fixed top-0 left-0 w-full h-1 bg-primary" />

      <nav className="flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Raven ACE Logo" className="w-10 h-10 object-contain" />
          <span className="text-h3 font-bold text-on-surface">Raven ACE</span>
        </div>
        <div className="flex gap-4">
          <Link to="/login" className="text-label-md text-on-surface-variant hover:text-on-surface py-2">Sign In</Link>
          <Link to="/register" className="bg-primary text-white px-4 py-2 rounded-lg text-label-md hover:bg-primary/90 transition-all">Get Started</Link>
        </div>
      </nav>

      <main className="flex-grow flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center max-w-2xl mb-16">
          <h1 className="text-display-md text-on-surface mb-4">Simple, transparent pricing</h1>
          <p className="text-body-lg text-on-surface-variant">
            Choose the perfect plan for your organization. Start testing and certifying your students today.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
          {/* Standard Plan */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 shadow-sm flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-tertiary"></div>
            <h3 className="text-display-sm text-on-surface mt-2">Standard</h3>
            <p className="text-body-md text-on-surface-variant mt-2">For small teams and growing organizations.</p>
            
            <div className="my-6">
              <span className="text-display-lg font-bold text-on-surface">$49</span>
              <span className="text-body-lg text-on-surface-variant">/month</span>
            </div>
            
            <ul className="space-y-4 flex-1">
              <li className="flex items-center gap-3 text-body-lg text-on-surface">
                <span className="material-symbols-outlined text-tertiary text-[24px]">check_circle</span>
                Up to 10 Instructors
              </li>
              <li className="flex items-center gap-3 text-body-lg text-on-surface">
                <span className="material-symbols-outlined text-tertiary text-[24px]">check_circle</span>
                Up to 100 Students
              </li>
              <li className="flex items-center gap-3 text-body-lg text-on-surface">
                <span className="material-symbols-outlined text-tertiary text-[24px]">check_circle</span>
                Custom Organization Branding
              </li>
              <li className="flex items-center gap-3 text-body-lg text-on-surface opacity-50">
                <span className="material-symbols-outlined text-outline text-[24px]">cancel</span>
                Priority Support
              </li>
            </ul>
            
            <Link to="/register" className="w-full mt-10 bg-surface-container border border-outline-variant text-on-surface py-4 rounded-xl text-label-lg text-center hover:bg-surface-container-high transition-colors">
              Get Started
            </Link>
          </div>

          {/* Premium Plan */}
          <div className="bg-surface-container-lowest border-2 border-primary rounded-2xl p-8 shadow-xl flex flex-col relative overflow-hidden transform md:-translate-y-4">
            <div className="absolute top-6 right-6 bg-primary text-white text-[12px] uppercase font-bold px-3 py-1 rounded-full tracking-wider">Popular</div>
            <h3 className="text-display-sm text-on-surface mt-2">Premium</h3>
            <p className="text-body-md text-on-surface-variant mt-2">For large institutions and enterprises.</p>
            
            <div className="my-6">
              <span className="text-display-lg font-bold text-on-surface">$199</span>
              <span className="text-body-lg text-on-surface-variant">/month</span>
            </div>
            
            <ul className="space-y-4 flex-1">
              <li className="flex items-center gap-3 text-body-lg text-on-surface">
                <span className="material-symbols-outlined text-primary text-[24px]">check_circle</span>
                Unlimited Instructors
              </li>
              <li className="flex items-center gap-3 text-body-lg text-on-surface">
                <span className="material-symbols-outlined text-primary text-[24px]">check_circle</span>
                Unlimited Students
              </li>
              <li className="flex items-center gap-3 text-body-lg text-on-surface">
                <span className="material-symbols-outlined text-primary text-[24px]">check_circle</span>
                Custom Organization Branding
              </li>
              <li className="flex items-center gap-3 text-body-lg text-on-surface">
                <span className="material-symbols-outlined text-primary text-[24px]">check_circle</span>
                Priority 24/7 Support
              </li>
            </ul>
            
            <Link to="/register" className="w-full mt-10 bg-primary text-white py-4 rounded-xl text-label-lg text-center hover:bg-primary/90 transition-colors shadow-md hover:shadow-lg">
              Get Premium
            </Link>
          </div>
        </div>

        <div className="mt-20 text-center max-w-2xl">
          <h2 className="text-h2 text-on-surface mb-4">Not an organization?</h2>
          <p className="text-body-md text-on-surface-variant mb-6">
            If you are an individual student or instructor not affiliated with an organization, you can register for free! Public exams are accessible to all registered users.
          </p>
          <Link to="/register" className="text-primary hover:underline font-medium">Create a free individual account</Link>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="py-8 border-t border-outline-variant text-center">
        <p className="text-label-sm text-on-surface-variant">© 2026 Raven ACE. All rights reserved.</p>
      </footer>

      {/* bg blobs */}
      <div className="fixed -bottom-48 -left-48 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed top-0 right-0 w-96 h-96 bg-tertiary/5 rounded-full blur-[100px] pointer-events-none" />
    </div>
  )
}

export default Pricing
