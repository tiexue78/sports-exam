import { createClient } from '@supabase/supabase-js'
import questions from '../questions.json'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function seed() {
  const supabase = createClient(supabaseUrl, supabaseKey)

  const rows = questions.map((q: any) => ({
    id: q.id,
    type: q.type,
    category: q.category,
    question: q.question,
    options: q.type === 'choice' ? q.options : null,
    answer: q.answer,
  }))

  const { error } = await supabase.from('questions').upsert(rows, { onConflict: 'id' })
  if (error) {
    console.error('Seed failed:', error)
    process.exit(1)
  }
  console.log(`Seeded ${rows.length} questions`)
}

seed()
