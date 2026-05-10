-- Enable RLS on all tables
ALTER TABLE public.network_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_favorites ENABLE ROW LEVEL SECURITY;

-- 1. Policies for network_users
-- Allow anyone to read users (needed for seeing owner details on properties)
CREATE POLICY "Allow public read access to network_users" 
ON public.network_users FOR SELECT 
USING (true);

-- Allow anyone to insert (for signup)
CREATE POLICY "Allow public insert to network_users" 
ON public.network_users FOR INSERT 
WITH CHECK (true);

-- Allow users to update their own profile
CREATE POLICY "Allow updates to own user profile" 
ON public.network_users FOR UPDATE 
USING (true);

-- 2. Policies for network_properties
-- Allow anyone to read all public properties
CREATE POLICY "Allow public read access to network_properties" 
ON public.network_properties FOR SELECT 
USING (true);

-- Allow anyone to insert properties
CREATE POLICY "Allow insertions into network_properties" 
ON public.network_properties FOR INSERT 
WITH CHECK (true);

-- Allow anyone to update properties
CREATE POLICY "Allow updates to network_properties" 
ON public.network_properties FOR UPDATE 
USING (true);

-- Allow anyone to delete properties 
CREATE POLICY "Allow deletes to network_properties" 
ON public.network_properties FOR DELETE 
USING (true);

-- 3. Policies for network_favorites
-- Allow anyone to read favorites
CREATE POLICY "Allow public read access to network_favorites" 
ON public.network_favorites FOR SELECT 
USING (true);

-- Allow inserting favorites
CREATE POLICY "Allow insertions into network_favorites" 
ON public.network_favorites FOR INSERT 
WITH CHECK (true);

-- Allow updating favorites
CREATE POLICY "Allow updates to network_favorites" 
ON public.network_favorites FOR UPDATE 
USING (true);

-- Allow deleting favorites
CREATE POLICY "Allow deletes to network_favorites" 
ON public.network_favorites FOR DELETE 
USING (true);
