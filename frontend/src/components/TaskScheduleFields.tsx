import { TaskPriority, TaskSchedule, taskPriorityLabels } from '../types/task';
import './TaskScheduleFields.css';

export default function TaskScheduleFields({
  value,
  onChange,
}: {
  value: TaskSchedule;
  onChange: (value: TaskSchedule) => void;
}) {
  return (
    <div className="task-schedule-fields">
      <label>
        Priority
        <select
          value={value.priority ?? ''}
          onChange={(event) =>
            onChange({
              ...value,
              priority: (event.target.value || null) as TaskPriority | null,
            })
          }
        >
          <option value="">No priority</option>
          {Object.entries(taskPriorityLabels).map(([priority, label]) => (
            <option key={priority} value={priority}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="task-schedule-date">
        <label>
          Due date
          <input
            type="date"
            min="0001-01-01"
            max="9999-12-31"
            value={value.dueDate ?? ''}
            onChange={(event) =>
              onChange({ ...value, dueDate: event.target.value || null })
            }
          />
        </label>
        {value.dueDate && (
          <button
            type="button"
            onClick={() => onChange({ ...value, dueDate: null })}
          >
            Clear due date
          </button>
        )}
      </div>
    </div>
  );
}
