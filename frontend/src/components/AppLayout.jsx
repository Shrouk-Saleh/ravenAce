import Sidebar from './Sidebar'

// Wraps every authenticated page with the sidebar layout.
// Pages just return their content — this component handles positioning.
//
// Responsive behaviour (Phase 11):
//  - Desktop (md and up): fixed sidebar on the left, content offset by
//    its width (ml-sidebar-width).
//  - Mobile: sidebar becomes an off-canvas drawer (handled inside
//    Sidebar itself), and a 56px top bar with a hamburger replaces it.
//    Content gets no left margin but needs top padding to clear that bar.
function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-background transition-colors duration-200">
      <Sidebar />
      <main className="md:ml-sidebar-width min-h-screen p-gutter pt-20 md:pt-gutter">
        {children}
      </main>
    </div>
  )
}

export default AppLayout
