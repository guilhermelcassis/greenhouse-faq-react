declare module 'lucide-react' {
  import React from 'react';
  
  export interface IconProps extends React.SVGProps<SVGSVGElement> {
    size?: string | number;
    strokeWidth?: string | number;
    color?: string;
    absoluteStrokeWidth?: boolean;
  }
  
  export type Icon = React.FC<IconProps>;
  
  // Export all the icons that we use in our app
  export const AlertCircle: Icon;
  export const CheckCircle: Icon;
  export const Trash2: Icon;
  export const X: Icon;
  export const User: Icon;
  export const Plus: Icon;
  export const Minus: Icon;
  export const Heart: Icon;
  export const Save: Icon;
  export const PenSquare: Icon;
  export const Home: Icon;
  export const ChevronDown: Icon;
  export const ChevronUp: Icon;
  export const Lock: Icon;
  export const Mail: Icon;
  export const ArrowRight: Icon;
  export const Menu: Icon;
  
  // Icons used in students page
  export const Search: Icon;
  export const CreditCard: Icon;
  export const FileText: Icon;
  export const Clock: Icon;
  export const ArrowLeft: Icon;
  export const Phone: Icon;
  export const Eye: Icon;
  export const RefreshCw: Icon;
  export const Info: Icon;
  export const Loader2: Icon;
  
  // Icons used in payments history page
  export const Calendar: Icon;
  export const ChevronLeft: Icon;
  export const ChevronRight: Icon;
  export const Filter: Icon;
  export const DollarSign: Icon;
  export const AlertTriangle: Icon;
  export const LogOut: Icon;
  export const LogIn: Icon;
  export const UserPlus: Icon;
  export const HelpCircle: Icon;
  
  // Add any other icons as needed
} 