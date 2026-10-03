import { PageHeader } from '@/components/ui';
import { TaskForm } from '@/components/task-form';

export const dynamic = 'force-dynamic';

export default function NewTaskPage() {
  return (
    <>
      <PageHeader title="New task" sub="Describe the data you need. The planner does the rest." />
      <div style={{ maxWidth: 760 }}>
        <TaskForm />
      </div>
    </>
  );
}
