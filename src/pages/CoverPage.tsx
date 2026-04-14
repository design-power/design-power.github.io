import { useNavigate } from 'react-router-dom';
import { useHorizontalSwipe } from '../hooks/useHorizontalSwipe';
import { useCoverOpenButtonStampAnimation } from '../hooks/useCoverOpenButtonStampAnimation';
import { HandwritingText } from '../components/HandwritingText';

import './cover.css';

export function CoverPage() {
  const navigate = useNavigate();

  const openButtonStampAnimation = useCoverOpenButtonStampAnimation({
    delayMs: 2000,
    animationDurationMs: 820,
  });

  const swipeHandlers = useHorizontalSwipe({
    onSwipeLeft: () => navigate('/protocol'),
  });

  const handleClick = () => {
    navigate('/protocol');
  };

  return (
    <section className="invitation-screen cover-screen" {...swipeHandlers}>
      <p className="cover-title">личное дело</p>

      <p className="cover-case-number">
        <span className="cover-case-prefix">№</span>
        <HandwritingText
          text="001"
          className="cover-case-script"
          durationMs={1400}
          delayMs={200}
          steps={6}
        />
        <span className="cover-case-line" aria-hidden />
      </p>

      <p className="cover-description">
        О задержании гражданки
        <br />
        с целью последующего
        <br />
        бракосочетания
      </p>

      <button
        type="button"
        className={`cover-open-button ${openButtonStampAnimation.stampStateClassName}`}
        onClick={handleClick}
      >
        Открыть дело
      </button>

      <img className="cover-heart-placeholder" src="/images/heart.webp" alt="" decoding="async" fetchPriority="high" aria-hidden />
    </section>
  );
}
