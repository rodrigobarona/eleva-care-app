import { workflows } from '@/config/novu';
import { serve } from '@novu/framework/next';

// Export the handlers for the Novu framework
// The serve function automatically handles GET, POST, and OPTIONS methods
export const { GET, POST, OPTIONS } = serve({ workflows });
