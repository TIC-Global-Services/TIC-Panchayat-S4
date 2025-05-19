'use client';
import { useState, useEffect, useRef } from 'react';
import * as htmlToImage from 'html-to-image';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import Pusher from 'pusher-js';

export default function Home() {
  const [votes, setVotes] = useState({ pradhan: 0, banrakas: 0 });
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [votedTeam, setVotedTeam] = useState<string | null>(null);
  const shareRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);

  // Fetch votes via HTTP with retries
  const fetchVotes = async (retries = 3, delay = 2000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch('/api/vote', {
          method: 'POST',
          body: JSON.stringify({ team: '' }),
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || `HTTP error: ${res.status}`);
        console.log('Fetched votes via HTTP:', data);
        setVotes(data);
        return;
      } catch (err) {
        console.error(`Attempt ${attempt} failed to fetch votes:`, err);
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        setMessage({ text: 'Failed to load votes after retries.', type: 'error' });
      }
    }
  };

  useEffect(() => {
    // Initialize Pusher
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!pusherKey || !pusherCluster) {
      console.error('Pusher key or cluster not configured');
      setMessage({ text: 'Real-time updates unavailable. Using fallback.', type: 'error' });
      fetchVotes();
      return;
    }

    console.log('Initializing Pusher with key:', pusherKey, 'cluster:', pusherCluster);
    pusherRef.current = new Pusher(pusherKey, {
      cluster: pusherCluster,
      forceTLS: true,
    });

    // Subscribe to vote-channel
    const channel = pusherRef.current.subscribe('vote-channel');
    channel.bind('vote_update', (data: { pradhan: number; banrakas: number }) => {
      console.log('Received Pusher vote_update:', data);
      setVotes(data);
    });

    channel.bind('pusher:subscription_succeeded', () => {
      console.log('Pusher subscription succeeded');
      fetchVotes(); // Fetch initial votes after subscription
    });

    channel.bind('pusher:subscription_error', (error: any) => {
      console.error('Pusher subscription error:', error);
      setMessage({ text: 'Failed to connect to real-time updates. Using fallback.', type: 'error' });
      fetchVotes();
    });

    return () => {
      if (pusherRef.current) {
        console.log('Disconnecting Pusher');
        pusherRef.current.disconnect();
      }
    };
  }, []);

  const handleVote = async (team: string) => {
    setIsLoading(true);
    setMessage(null);
    console.log('Submitting vote for:', team);
    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        body: JSON.stringify({ team }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to submit vote');
      }
      console.log('Vote submitted successfully:', data);
      setVotedTeam(team);
      setShowModal(true);
      setMessage({ text: 'Vote submitted successfully!', type: 'success' });
    } catch (err: any) {
      console.error('Vote submission error:', err);
      setMessage({ text: err.message || 'Failed to submit vote. Please try again.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!shareRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(shareRef.current);
      const link = document.createElement('a');
      link.download = 'voting-certificate.png';
      link.href = dataUrl;
      link.click();
      setMessage({ text: 'Certificate downloaded!', type: 'success' });
    } catch (err) {
      console.error('Certificate generation error:', err);
      setMessage({ text: 'Failed to generate certificate.', type: 'error' });
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setVotedTeam(null);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-yellow-300 via-orange-200 to-red-200 p-6">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-5xl font-extrabold text-gray-800 mb-8 drop-shadow-lg"
      >
        Vote for Panchayat S4!
      </motion.h1>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-6 px-4 py-2 rounded-lg flex items-center space-x-2 ${
              message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {message.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
            <span>{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 w-full max-w-3xl"
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Current Results</h2>
        <div className="bg-white p-6 rounded-xl shadow-lg flex justify-between items-center">
          <div className="text-lg font-semibold text-gray-800 text-left">
            <span>Team Pradhan 🥒</span>
            <div className="mt-1">{votes.pradhan}</div>
          </div>
          <div className="text-lg font-semibold text-gray-800 text-center">
            <span>Total Votes</span>
            <div className="mt-1">{votes.pradhan + votes.banrakas}</div>
          </div>
          <div className="text-lg font-semibold text-gray-800 text-right">
            <span>Team Banrakas 🍳</span>
            <div className="mt-1">{votes.banrakas}</div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6"
      >
        <button
          onClick={() => handleVote('pradhan')}
          disabled={isLoading}
          className="relative bg-gradient-to-r from-green-500 to-green-700 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg hover:from-green-600 hover:to-green-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
        >
          <span className="relative z-10 flex items-center space-x-2">
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Team Pradhan 🥒'}
          </span>
          <div className="absolute inset-0 bg-white opacity-0 hover:opacity-10 transition-opacity"></div>
        </button>
        <button
          onClick={() => handleVote('banrakas')}
          disabled={isLoading}
          className="relative bg-gradient-to-r from-red-500 to-red-700 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg hover:from-red-600 hover:to-red-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
        >
          <span className="relative z-10 flex items-center space-x-2">
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Team Banrakas 🍳'}
          </span>
          <div className="absolute inset-0 bg-white opacity-0 hover:opacity-10 transition-opacity"></div>
        </button>
      </motion.div>

      <AnimatePresence>
        {showModal && votedTeam && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-gradient-to-br from-white to-gray-100 p-8 rounded-2xl shadow-2xl max-w-md w-full relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/confetti.png')] opacity-10"></div>
              <div ref={shareRef} className="text-center relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                >
                  <CheckCircle className="mx-auto text-green-500" size={48} />
                </motion.div>
                <h2 className="text-3xl font-bold text-gray-800 mt-4">Vote Confirmed!</h2>
                <p className="text-lg mt-2 text-gray-600">
                  You voted for{' '}
                  <strong className={votedTeam === 'pradhan' ? 'text-green-600' : 'text-red-600'}>
                    {votedTeam === 'pradhan' ? 'Team Pradhan 🥒' : 'Team Banrakas 🍳'}
                  </strong>
                </p>
                <p className="text-sm text-gray-500 mt-2">#PanchayatSeason4 #PrimeVideo</p>
              </div>
              <div className="mt-8 flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4 relative z-10">
                <button
                  onClick={handleDownload}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Share Certificate 📸
                </button>
                <button
                  onClick={handleCloseModal}
                  className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Vote Again
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}