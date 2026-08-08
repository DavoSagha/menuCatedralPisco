import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY

const supabase = createClient(supabaseUrl, serviceKey)

async function fixRoles() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers()
  if (error) {
    console.error('Error fetching users:', error)
    return
  }

  for (const user of users) {
    if (user.email === 'admin@catedradelpisco.com') {
      await supabase.auth.admin.updateUserById(user.id, { app_metadata: { role: 'admin' } })
      console.log('Fixed admin role.')
    }
    if (user.email === 'staff@catedradelpisco.com') {
      await supabase.auth.admin.updateUserById(user.id, { app_metadata: { role: 'staff', branch_id: 1 } })
      console.log('Fixed staff role.')
    }
  }
}

fixRoles()
