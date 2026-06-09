import styles from './page.module.scss';

export default function Home() {
  return (
    <div className={styles.shell}>
      <div className={styles.appFrame}>
        <div className={styles.placeholder}>
          <div className={styles.title}>빠따 디펜스</div>
          <div className={styles.subtitle}>부트스트랩 완료. 곧 게임 마운트.</div>
        </div>
      </div>
    </div>
  );
}
