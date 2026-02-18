import { Heart, BookOpen, Users, School, CheckCircle, Target, Eye, BarChart } from "lucide-react";

export const ICON_MAP: Record<string, any> = {
    Users: Users,
    School: School,
    BookOpen: BookOpen,
    Heart: Heart,
    CheckCircle: CheckCircle,
    Target: Target,
    Eye: Eye,
    BarChart: BarChart,
};

export const getIcon = (iconName: string) => {
    return ICON_MAP[iconName] || Heart; // Default to Heart if not found
};
