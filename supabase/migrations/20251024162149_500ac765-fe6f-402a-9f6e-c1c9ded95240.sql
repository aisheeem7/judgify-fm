-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own tokens" ON public.spotify_tokens;
DROP POLICY IF EXISTS "Users can insert their own tokens" ON public.spotify_tokens;
DROP POLICY IF EXISTS "Users can update their own tokens" ON public.spotify_tokens;

-- Recreate policies with explicit authentication requirement
CREATE POLICY "Users can view their own tokens"
ON public.spotify_tokens
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tokens"
ON public.spotify_tokens
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens"
ON public.spotify_tokens
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);