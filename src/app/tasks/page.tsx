import { createServerAuthClient } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import KanbanBoard from '@/components/tasks/KanbanBoard';
import { AppPageShell } from '@/components/layouts/app-page-shell';

export const dynamic = 'force-dynamic';

async function TasksPageContent() {
  const authClient = await createServerAuthClient();
  const { data: { session } } = await authClient.auth.getSession();

  if (!session) {
    redirect('/auth/login?message=Please log in to view tasks');
  }

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b">
        <h1 className="text-2xl font-bold">Quadro de Tarefas</h1>
        <p className="text-muted-foreground">Gerencie suas tarefas com o quadro Kanban.</p>
      </header>
      <main className="flex-grow overflow-hidden">
        <KanbanBoard />
      </main>
    </div>
  );
}

export default function TasksPage() {
  return <AppPageShell><TasksPageContent /></AppPageShell>;
}
