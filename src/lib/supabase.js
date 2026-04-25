import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rqscrvzachpkylcpvwml.supabase.co'
const supabaseKey = 'sb_publishable_h2T5WKUCgbcKQWagND74Jg_eSblE9sh'

export const supabase = createClient(supabaseUrl, supabaseKey)
