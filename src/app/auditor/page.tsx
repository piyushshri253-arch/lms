import { redirect } from 'next/navigation';

export default function AuditorRedirectPage() {
  redirect('/reviewer');
}
