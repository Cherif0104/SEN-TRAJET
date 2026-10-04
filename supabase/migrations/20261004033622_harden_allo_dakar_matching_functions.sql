revoke all on function public.auto_match_allo_dakar_departure()
from public, anon, authenticated;

revoke execute on function public.cancel_allo_dakar_booking(uuid)
from anon;
