import { redirect } from 'next/navigation';

export default function StudentCertificatesRedirect() {
  redirect('/student/learning?tab=certificates');
}
