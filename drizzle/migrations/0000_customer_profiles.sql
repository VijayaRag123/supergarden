CREATE TABLE public.profiles (
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 first_name text NOT NULL DEFAULT '' CHECK (char_length(first_name) <= 100),
 surname text NOT NULL DEFAULT '' CHECK (char_length(surname) <= 100),
 mobile_number text NOT NULL DEFAULT '' CHECK (mobile_number = '' OR mobile_number ~ '^\+?[0-9]{10,15}$'),
 home_address text NOT NULL DEFAULT '' CHECK (char_length(home_address) <= 500),
 date_of_birth date,
 gender text CHECK (gender IS NULL OR gender IN ('female','male','other','prefer_not_to_say')),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own profile" ON public.profiles FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id);
CREATE POLICY "Create own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);
CREATE FUNCTION public.validate_profile_birth_date() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NEW.date_of_birth IS NOT NULL AND (NEW.date_of_birth > CURRENT_DATE OR NEW.date_of_birth < DATE '1900-01-01') THEN
  RAISE EXCEPTION 'Invalid date of birth';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER validate_profile_birth_date BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.validate_profile_birth_date();
CREATE FUNCTION public.create_customer_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.profiles(id, first_name, surname, mobile_number, home_address, date_of_birth, gender)
 VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'first_name',''), COALESCE(NEW.raw_user_meta_data->>'surname',''), COALESCE(NEW.raw_user_meta_data->>'mobile_number',''), COALESCE(NEW.raw_user_meta_data->>'home_address',''), NULLIF(NEW.raw_user_meta_data->>'date_of_birth','')::date, NULLIF(NEW.raw_user_meta_data->>'gender',''));
 RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_customer_profile() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_customer_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_customer_profile();
INSERT INTO public.profiles(id) SELECT id FROM auth.users ON CONFLICT (id) DO NOTHING;