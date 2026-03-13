import { Box } from '@mui/material';
import { ProjectHeaderNav } from '@/components/ProjectHeaderNav';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <Box sx={{ flexShrink: 0, borderBottom: 1, borderColor: 'divider', backgroundColor: 'background.paper' }}>
                <ProjectHeaderNav />
            </Box>
            <Box component="main" sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                {children}
            </Box>
        </Box>
    );
}
