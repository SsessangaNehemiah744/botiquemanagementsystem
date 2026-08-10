import { redirect } from 'next/navigation';

export default function Home() {
  // Automatically send users to the BoutiqueOS dashboard
  redirect('/dashboard');
}