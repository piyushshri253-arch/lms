import { redirect } from 'next/navigation';

export default function AuditorLoginRedirectPage() {
  redirect('/reviewer/login');
}
