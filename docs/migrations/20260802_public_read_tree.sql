-- ============================================================
-- PUBLIC READ ACCESS cho Trang chủ (xem gia phả không cần đăng nhập)
-- Cho phép vai trò 'anon' (khách chưa đăng nhập) ĐỌC persons + relationships.
-- Thông tin riêng tư (person_details_private) VẪN chỉ admin xem được.
-- ============================================================

-- PERSONS: cho phép cả anon lẫn authenticated đọc
drop policy if exists "Enable read access for authenticated users" on public.persons;
drop policy if exists "Public can read persons" on public.persons;
create policy "Public can read persons"
on public.persons
for select
to anon, authenticated
using (true);

-- RELATIONSHIPS: cho phép cả anon lẫn authenticated đọc
drop policy if exists "Enable read access for authenticated users" on public.relationships;
drop policy if exists "Public can read relationships" on public.relationships;
create policy "Public can read relationships"
on public.relationships
for select
to anon, authenticated
using (true);
