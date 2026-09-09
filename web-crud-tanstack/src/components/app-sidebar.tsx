import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Blocks,
  Bot,
  CalendarDays,
  ChevronsUpDown,
  Columns3,
  CreditCard,
  FolderKanban,
  FolderTree,
  LayoutDashboard,
  Library,
  LifeBuoy,
  LogIn,
  LogOut,
  Package,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  Users,
  UserRoundCog,
} from "lucide-react";

import { signOut, useSession } from "../lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "./ui/sidebar";
import { UserAvatar } from "./user-avatar";

const PINNED = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/reports", label: "Reports", icon: BarChart3 },
] as const;

const GROUPS = [
  {
    label: "Sales",
    items: [
      { to: "/customers", label: "Customers", icon: Users },
      { to: "/orders", label: "Orders", icon: ShoppingCart },
      { to: "/invoices", label: "Invoices", icon: Receipt },
      { to: "/products", label: "Products", icon: Package },
    ],
  },
  {
    label: "Workspace",
    items: [
      { to: "/projects", label: "Projects", icon: FolderKanban },
      { to: "/calendar", label: "Calendar", icon: CalendarDays },
      { to: "/files", label: "Files", icon: FolderTree },
    ],
  },
  {
    label: "Support",
    items: [
      { to: "/tickets", label: "Tickets", icon: LifeBuoy },
      { to: "/board", label: "Board", icon: Columns3 },
      { to: "/activity", label: "Activity", icon: Activity },
    ],
  },
  {
    label: "AI",
    items: [
      { to: "/assistant", label: "Assistant", icon: Bot },
      { to: "/prompts", label: "Prompts", icon: Library },
      { to: "/ai-settings", label: "AI settings", icon: SlidersHorizontal },
    ],
  },
  {
    label: "Admin",
    items: [
      { to: "/team", label: "Team", icon: UserRoundCog },
      { to: "/roles", label: "Roles", icon: ShieldCheck },
      { to: "/integrations", label: "Integrations", icon: Blocks },
    ],
  },
] as const;

export const AppSidebar = () => {
  const { pathname } = useLocation();
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <Sidebar>
      <SidebarHeader>
        <Link to="/" className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            W
          </span>
          Web CRUD
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {PINNED.map((r) => (
                <SidebarMenuItem key={r.to}>
                  <SidebarMenuButton asChild isActive={isActive(r.to)}>
                    <Link to={r.to}>
                      <r.icon />
                      <span>{r.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((r) => (
                  <SidebarMenuItem key={r.to}>
                    <SidebarMenuButton asChild isActive={isActive(r.to)}>
                      <Link to={r.to}>
                        <r.icon />
                        <span>{r.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};

const UserMenu = () => {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const user = session?.user;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
              <UserAvatar name={user?.name} email={user?.email} className="size-8 text-xs" />
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">{user?.name ?? "Guest"}</span>
                <span className="truncate text-xs text-muted-foreground">{user?.email ?? "not signed in"}</span>
              </span>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width)">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {user ? "Signed in" : "Demo"}
            </DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link to="/account">
                <UserRound />
                Account
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/billing">
                <CreditCard />
                Billing
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings">
                <Settings />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/getting-started">
                <Sparkles />
                Getting started
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/changelog">
                <ScrollText />
                Changelog
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {user ? (
              <DropdownMenuItem
                onClick={() => {
                  signOut();
                  navigate({ to: "/sign-in" });
                }}
              >
                <LogOut />
                Sign out
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem asChild>
                <Link to="/sign-in">
                  <LogIn />
                  Sign in
                </Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
