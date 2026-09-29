insert into public.categories (id, name) values
    ('web-development', 'Web Development'),
    ('ui-ux-design', 'UI/UX Design'),
    ('graphic-design', 'Graphic Design'),
    ('writing', 'Writing'),
    ('marketing', 'Marketing'),
    ('video-editing', 'Video Editing')
on conflict (name) do nothing;