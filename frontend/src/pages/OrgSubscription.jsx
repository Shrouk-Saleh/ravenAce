import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import api from '../api/axios'
import { useSearchParams } from 'react-router-dom'

function OrgSubscription() {
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [searchParams] = useSearchParams()

  useEffect(() => {
    fetchSubscription()
    
    // Check URL params for success/cancel from Stripe
    if (searchParams.get('success')) {
      setMessage('Subscription successful! Your account limits have been updated.')
    }
    if (searchParams.get('canceled')) {
      setError('Checkout was canceled.')
    }
  }, [searchParams])

  const fetchSubscription = async () => {
    try {
      const { data } = await api.get('/stripe/subscription')
      setSubscription(data.data)
    } catch (err) {
      setError('Failed to load subscription details')
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async (plan) => {
    setActionLoading(true)
    setError('')
    try {
      const { data } = await api.post('/stripe/create-checkout', { plan })
      window.location.href = data.data.url
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start checkout')
      setActionLoading(false)
    }
  }

  const handleManageBilling = async () => {
    setActionLoading(true)
    setError('')
    try {
      const { data } = await api.post('/stripe/billing-portal')
      window.location.href = data.data.url
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to open billing portal')
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription? You will retain access until the end of the billing period.')) return
    
    setActionLoading(true)
    try {
      const { data } = await api.post('/stripe/cancel')
      setMessage(data.message)
      fetchSubscription()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel subscription')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 lg:pl-sidebar-width flex items-center justify-center">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
        </main>
      </div>
    )
  }

  const isSubscribed = subscription?.subscriptionPlan === 'standard' || subscription?.subscriptionPlan === 'premium'

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 lg:pl-sidebar-width">
        <div className="max-w-4xl mx-auto p-4 lg:p-8">
          
          <div className="mb-8">
            <h1 className="text-display-sm text-on-surface">Subscription & Billing</h1>
            <p className="text-body-md text-on-surface-variant">Manage your organization's plan, billing history, and limits.</p>
          </div>

          {message && (
            <div className="mb-6 p-4 rounded-lg bg-primary-container/20 border border-primary/20 text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">check_circle</span>
              {message}
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-error-container border border-error/20 text-on-error-container flex items-center gap-2">
              <span className="material-symbols-outlined text-error">error</span>
              {error}
            </div>
          )}

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm mb-8">
            <h2 className="text-h3 text-on-surface mb-6">Current Plan</h2>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
               <div>
                  <p className="text-display-sm text-primary capitalize">{subscription?.subscriptionPlan === 'none' ? 'Free Tier' : subscription?.subscriptionPlan}</p>
                  <p className="text-label-md text-on-surface-variant mt-1">Status: <span className="font-semibold">{subscription?.subscriptionStatus || 'Inactive'}</span></p>
               </div>
               
               {isSubscribed && (
                  <div className="flex flex-col sm:flex-row gap-3">
                     <button
                        onClick={handleManageBilling}
                        disabled={actionLoading}
                        className="bg-surface-container border border-outline-variant text-on-surface px-4 py-2 rounded-lg text-label-md hover:bg-surface-container-high transition-colors"
                     >
                        Manage Billing
                     </button>
                     {subscription.subscriptionStatus !== 'canceled' && (
                        <button
                           onClick={handleCancel}
                           disabled={actionLoading}
                           className="bg-error-container text-on-error-container px-4 py-2 rounded-lg text-label-md hover:bg-error/20 transition-colors"
                        >
                           Cancel Plan
                        </button>
                     )}
                  </div>
               )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-outline-variant">
               <div className="p-4 bg-surface border border-outline-variant rounded-lg flex items-center justify-between">
                  <div>
                     <p className="text-label-sm text-on-surface-variant">Instructor Limit</p>
                     <p className="text-h2 text-on-surface">{subscription?.maxInstructors || 0}</p>
                  </div>
                  <span className="material-symbols-outlined text-[32px] text-tertiary opacity-50">co_present</span>
               </div>
               <div className="p-4 bg-surface border border-outline-variant rounded-lg flex items-center justify-between">
                  <div>
                     <p className="text-label-sm text-on-surface-variant">Student Limit</p>
                     <p className="text-h2 text-on-surface">{subscription?.maxStudents === 999999 ? 'Unlimited' : (subscription?.maxStudents || 0)}</p>
                  </div>
                  <span className="material-symbols-outlined text-[32px] text-primary opacity-50">group</span>
               </div>
            </div>
          </div>

          {!isSubscribed && (
            <div className="space-y-6">
               <h2 className="text-h3 text-on-surface">Available Plans</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 
                 {/* Standard Plan */}
                 <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-tertiary"></div>
                    <h3 className="text-h2 text-on-surface mt-2">Standard</h3>
                    <p className="text-display-xs font-bold text-on-surface mt-2">$49<span className="text-body-md font-normal text-on-surface-variant">/month</span></p>
                    
                    <ul className="mt-6 space-y-3 flex-1">
                       <li className="flex items-center gap-2 text-body-md text-on-surface">
                          <span className="material-symbols-outlined text-tertiary text-[20px]">check_circle</span>
                          Up to 10 Instructors
                       </li>
                       <li className="flex items-center gap-2 text-body-md text-on-surface">
                          <span className="material-symbols-outlined text-tertiary text-[20px]">check_circle</span>
                          Up to 100 Students
                       </li>
                       <li className="flex items-center gap-2 text-body-md text-on-surface">
                          <span className="material-symbols-outlined text-tertiary text-[20px]">check_circle</span>
                          Custom Branding
                       </li>
                    </ul>
                    
                    <button
                       onClick={() => handleSubscribe('standard')}
                       disabled={actionLoading}
                       className="w-full mt-8 bg-tertiary text-on-tertiary py-3 rounded-lg text-label-md hover:bg-tertiary/90 transition-colors disabled:opacity-50"
                    >
                       Subscribe to Standard
                    </button>
                 </div>

                 {/* Premium Plan */}
                 <div className="bg-surface-container-lowest border-2 border-primary rounded-xl p-6 shadow-sm flex flex-col relative overflow-hidden">
                    <div className="absolute top-4 right-4 bg-primary text-white text-[10px] uppercase font-bold px-2 py-1 rounded-full">Popular</div>
                    <h3 className="text-h2 text-on-surface mt-2">Premium</h3>
                    <p className="text-display-xs font-bold text-on-surface mt-2">$199<span className="text-body-md font-normal text-on-surface-variant">/month</span></p>
                    
                    <ul className="mt-6 space-y-3 flex-1">
                       <li className="flex items-center gap-2 text-body-md text-on-surface">
                          <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                          Unlimited Instructors
                       </li>
                       <li className="flex items-center gap-2 text-body-md text-on-surface">
                          <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                          Unlimited Students
                       </li>
                       <li className="flex items-center gap-2 text-body-md text-on-surface">
                          <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                          Custom Branding & Priority Support
                       </li>
                    </ul>
                    
                    <button
                       onClick={() => handleSubscribe('premium')}
                       disabled={actionLoading}
                       className="w-full mt-8 bg-primary text-white py-3 rounded-lg text-label-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                       Subscribe to Premium
                    </button>
                 </div>

               </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

export default OrgSubscription
