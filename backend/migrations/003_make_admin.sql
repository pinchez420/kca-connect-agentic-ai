-- Run this SQL to make your account an admin
-- Execute this in Supabase SQL Editor

UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"_admin": true}'::jsonb
WHERE email = '2205647@students.kcau.ac.ke';

-- Verify it worked
SELECT id, email, raw_user_meta_data 
FROM auth.users 
WHERE email = '2205647@students.kcau.ac.ke';

