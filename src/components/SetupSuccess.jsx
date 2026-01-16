function SetupSuccess({ onContinue }) {
  return (
    <div className="card p-8 text-center">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path d="M12 20L18 26L28 14" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        You're All Set!
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        Your Xray Cloud credentials have been validated and saved.
      </p>

      <button onClick={onContinue} className="btn btn-primary">
        Start Creating Test Cases
      </button>
    </div>
  );
}

export default SetupSuccess;
