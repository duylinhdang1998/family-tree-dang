import { getTodayLunar } from "@/utils/dateHelpers";
import { computeEvents } from "@/utils/eventHelpers";
import { getIsAdmin, getSupabase } from "@/utils/supabase/queries";
import {
  ArrowRight,
  BarChart2,
  Cake,
  Database,
  Flower2,
  GitMerge,
  Image as ImageIcon,
  Info,
  Network,
  Star,
  Users,
} from "lucide-react";
import Link from "next/link";

/* ── Event type helpers ───────────────────────────────────────────── */
const eventTypeConfig = {
  birthday: { icon: Cake, label: "Sinh nhật" },
  death_anniversary: { icon: Flower2, label: "Ngày giỗ" },
  custom_event: { icon: Star, label: "Sự kiện" },
};

export default async function DashboardLaunchpad() {
  const isAdmin = await getIsAdmin();
  const supabase = await getSupabase();

  /* ── Fetch events data ────────────────────────────────────────── */
  const { data: persons } = await supabase
    .from("persons")
    .select(
      "id, full_name, birth_year, birth_month, birth_day, death_year, death_month, death_day, death_lunar_year, death_lunar_month, death_lunar_day, is_deceased",
    );

  const { data: customEvents } = await supabase
    .from("custom_events")
    .select("id, name, content, event_date, location, created_by");

  const allEvents = computeEvents(persons ?? [], customEvents ?? []);
  const upcomingEvents = allEvents.filter(
    (e) => e.daysUntil >= 0 && e.daysUntil <= 30,
  );

  const lunar = getTodayLunar();

  /* ── Feature lists ────────────────────────────────────────────── */
  const publicFeatures = [
    {
      title: "Cây gia phả",
      description: "Xem và tương tác với sơ đồ dòng họ",
      icon: Network,
      href: "/dashboard/members",
    },
    {
      title: "Tra cứu danh xưng",
      description: "Hệ thống gọi tên họ hàng chuẩn xác",
      icon: GitMerge,
      href: "/dashboard/kinship",
    },
    {
      title: "Thống kê gia phả",
      description: "Tổng quan dữ liệu và biểu đồ phân tích",
      icon: BarChart2,
      href: "/dashboard/stats",
    },
    {
      title: "Phòng trưng bày",
      description: "Lưu giữ và chia sẻ hình ảnh, kỷ niệm dòng họ",
      icon: ImageIcon,
      href: "/dashboard/gallery",
    },
    {
      title: "Giới thiệu & Liên hệ",
      description: "Thông tin về ứng dụng và đội ngũ phát triển",
      icon: Info,
      href: "/about",
    },
  ];

  const adminFeatures = [
    {
      title: "Quản lý Người dùng",
      description: "Phê duyệt tài khoản và phân quyền",
      icon: Users,
      href: "/dashboard/users",
    },
    {
      title: "Thứ tự gia phả",
      description: "Sắp xếp và xem cấu trúc hệ thống",
      icon: Network,
      href: "/dashboard/lineage",
    },
    {
      title: "Sao lưu & Phục hồi",
      description: "Xuất/Nhập dữ liệu toàn hệ thống",
      icon: Database,
      href: "/dashboard/data",
    },
  ];

  return (
    <main className="flex-1 flex flex-col p-4 sm:p-8 max-w-7xl mx-auto w-full">
      {/* ── Today's Date & Upcoming Events ─────────────────── */}
      <Link
        href="/dashboard/events"
        className="group block border border-border bg-card hover:border-foreground/30 transition-colors duration-150 mb-10"
      >
        <div className="flex flex-col md:flex-row">
          {/* Date section */}
          <div className="md:w-[32%] w-full p-6 sm:p-7 border-b md:border-b-0 md:border-r border-border">
            <p className="mono-label mb-3">Hôm nay</p>
            <p className="text-2xl font-display font-bold text-foreground tracking-tight">
              {lunar.solarStr}
            </p>
            <p className="font-mono text-sm text-muted-foreground mt-2">
              ÂL: {lunar.lunarDayStr} · {lunar.lunarYear}
            </p>
          </div>

          {/* Events summary */}
          <div className="md:w-[68%] w-full p-6 sm:p-7">
            {upcomingEvents.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="mono-label flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-foreground" />
                    Sự kiện 30 ngày tới ({upcomingEvents.length})
                  </p>
                  <ArrowRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {upcomingEvents.slice(0, 4).map((evt, i) => {
                    const cfg = eventTypeConfig[evt.type];
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 border border-border hover:bg-muted transition-colors"
                      >
                        <Icon className="size-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium text-foreground truncate block">
                            {evt.personName}
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground block">
                            {evt.daysUntil === 0
                              ? "Hôm nay"
                              : evt.daysUntil === 1
                                ? "Ngày mai"
                                : `${evt.daysUntil} ngày nữa`}{" "}
                            · {evt.eventDateLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {upcomingEvents.length > 4 && (
                  <p className="font-mono text-[11px] text-muted-foreground mt-3">
                    + {upcomingEvents.length - 4} sự kiện khác đang chờ
                  </p>
                )}
              </>
            ) : (
              <div className="flex flex-col items-start justify-center h-full gap-2">
                <p className="mono-label">Sự kiện</p>
                <p className="text-muted-foreground">
                  Không có sự kiện nào trong 30 ngày tới.
                </p>
                <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
                  Xem sự kiện trong năm
                  <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* ── Feature Grid ──────────────────────────────────── */}
      <div className="space-y-10">
        <section>
          <p className="mono-label mb-4">Chức năng</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {publicFeatures.map((feat) => {
              const Icon = feat.icon;
              return (
                <Link
                  key={feat.href}
                  href={feat.href}
                  className="group flex flex-col p-5 border border-border bg-card hover:border-foreground/30 transition-colors duration-150"
                >
                  <div className="flex items-center justify-between mb-4">
                    <Icon className="size-5 text-foreground" />
                    <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h4 className="text-base font-display font-semibold text-foreground tracking-tight mb-1">
                    {feat.title}
                  </h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {feat.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        {isAdmin && (
          <section>
            <p className="mono-label mb-4">Quản trị viên</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {adminFeatures.map((feat) => {
                const Icon = feat.icon;
                return (
                  <Link
                    key={feat.href}
                    href={feat.href}
                    className="group flex flex-col p-5 border border-border bg-card hover:border-foreground/30 transition-colors duration-150"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <Icon className="size-5 text-foreground" />
                      <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <h4 className="text-base font-display font-semibold text-foreground tracking-tight mb-1">
                      {feat.title}
                    </h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {feat.description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
