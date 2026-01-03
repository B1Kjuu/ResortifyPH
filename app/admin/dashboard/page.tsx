import { redirect } from 'next/navigation'

// Dashboard has been consolidated into Command Center
export default function DashboardRedirect() {
  redirect('/admin/command-center')
}
