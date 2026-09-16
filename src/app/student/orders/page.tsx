import { redirect } from 'next/navigation';

export default function StudentOrdersRedirect() {
  redirect('/student/learning?tab=orders');
}
