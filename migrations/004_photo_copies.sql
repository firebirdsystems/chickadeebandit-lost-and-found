-- A copy of the post's photo with its background removed, made by the hub when
-- someone asks for one (manifest.required_capabilities "image_cutout").
--
-- NULL for every post until then, and again once someone puts the background
-- back. The photo in `photo_file_id` is always kept.
ALTER TABLE app_lost_and_found__posts ADD COLUMN cutout_file_id TEXT;

-- A small copy of the same photo for grids and lists, made in the browser at
-- upload and stored by the hub with the photo. NULL when none was kept (a
-- photo that is already small, a format the browser could not draw) and for
-- every photo added before this column: the photo itself is drawn instead.
ALTER TABLE app_lost_and_found__posts ADD COLUMN thumb_file_id TEXT;

-- A small copy of the cutout, made in the browser from the cutout the hub
-- hands back and kept by the hub beside it, transparent like it. Set and
-- cleared together with `cutout_file_id`. NULL when none could be kept: the
-- cutout itself is drawn instead.
ALTER TABLE app_lost_and_found__posts ADD COLUMN cutout_thumb_file_id TEXT;
