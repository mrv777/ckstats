'use client';

import Link from 'next/link';
import ThemeController from './ThemeController';
import { useState, useRef } from 'react';
import { validateBitcoinAddress } from '../utils/validateBitcoinAddress';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';

export default function Header() {
  const [address, setAddress] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const modalRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  const addUserMutation = useMutation({
    mutationFn: async (address: string) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add address');
      }
      return response.json();
    },
    onSuccess: () => {
      setAddress('');
      setModalMessage('Address added successfully!');
      setIsError(false);
      modalRef.current?.showModal();
      setTimeout(() => {
        router.push(`/users/${address}`);
      }, 1500);
    },
    onError: (error: Error) => {
      if (error.message === 'Bitcoin address already exists') {
        router.push(`/users/${address}`);
      } else {
        setModalMessage(error.message);
        setIsError(true);
        modalRef.current?.showModal();
      }
    },
  });

  const handleAddAddress = async () => {
    if (!validateBitcoinAddress(address)) {
      setModalMessage('Invalid Bitcoin address');
      setIsError(true);
      modalRef.current?.showModal();
      return;
    }

    addUserMutation.mutate(address);
  };

  return (
    <header className="navbar bg-base-100">
      <div className="flex-1">
        <Link href="/" className="btn btn-ghost normal-case text-xl">
          CKPool Stats
        </Link>
      </div>
      <div className="flex-none gap-2">
        <div className="form-control">
          <input
            type="text"
            placeholder="Enter Bitcoin address"
            className="input input-bordered w-96 text-sm"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={handleAddAddress}>
          Add Address
        </button>
        <ThemeController />
      </div>

      {/* DaisyUI Modal */}
      <dialog ref={modalRef} className="modal modal-bottom sm:modal-middle">
        <form method="dialog" className="modal-box">
          <h3 className={`font-bold text-lg ${isError ? 'text-error' : 'text-success'}`}>
            {isError ? 'Error' : 'Success'}
          </h3>
          <p className="py-4">{modalMessage}</p>
          <div className="modal-action">
            <button className="btn">Close</button>
          </div>
        </form>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </header>
  );
}