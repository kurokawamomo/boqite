<script lang="ts">
	/**
	 * Boquito（帳簿を持つ蜂）。部品ごとの <g> を CSS で動かす SVG キャラクター。
	 * 色は --bq-* で差し替えられる。組み込み先は本コンポーネントの責務外。
	 */
	export type BoquitoMood = 'idle' | 'happy' | 'sad' | 'cheer';

	let { mood = 'idle', size = 160 }: { mood?: BoquitoMood; size?: number } = $props();

	const uid = $props.id();
</script>

<svg
	class="boquito"
	data-mood={mood}
	viewBox="0 0 200 200"
	width={size}
	height={size}
	role="img"
	aria-label="Boquito"
>
	<defs>
		<clipPath id="{uid}-body">
			<ellipse cx="100" cy="112" rx="64" ry="56" />
		</clipPath>
	</defs>

	<g class="spin">
		<g class="bob">
			<!-- 羽 -->
			<g class="wing-l">
				<ellipse class="wing" cx="66" cy="54" rx="27" ry="14" transform="rotate(-35 66 54)" />
			</g>
			<g class="wing-r">
				<ellipse class="wing" cx="134" cy="54" rx="27" ry="14" transform="rotate(35 134 54)" />
			</g>

			<!-- 触角（胴の後ろ） -->
			<g class="ant-l">
				<g class="ant-pose">
					<path class="line" d="M84 66 Q78 42 66 30" />
					<circle class="dark" cx="66" cy="30" r="6" />
				</g>
			</g>
			<g class="ant-r">
				<g class="ant-pose">
					<path class="line" d="M116 66 Q122 42 134 30" />
					<circle class="dark" cx="134" cy="30" r="6" />
				</g>
			</g>

			<!-- かばん（胴の後ろ側） -->
			<g class="bag">
				<rect class="bag-body" x="20" y="98" width="32" height="44" rx="10" />
				<path class="bag-flap" d="M22 108 Q36 120 50 108" />
			</g>

			<!-- 胴 -->
			<g class="torso">
				<ellipse class="body" cx="100" cy="112" rx="64" ry="56" />
				<g clip-path="url(#{uid}-body)">
					<path class="stripe" d="M30 128 Q100 146 170 128 V141 Q100 159 30 141 Z" />
					<path class="stripe" d="M30 150 Q100 168 170 150 V162 Q100 180 30 162 Z" />
				</g>
			</g>

			<!-- かばんの肩ひも -->
			<g class="strap">
				<path class="strap-line" d="M72 62 C52 78 44 104 48 132" />
				<rect class="buckle" x="45" y="94" width="10" height="9" rx="2" />
			</g>

			<!-- 顔 -->
			<g class="face">
				<g class="cheeks">
					<circle class="cheek" cx="66" cy="108" r="7" />
					<circle class="cheek" cx="134" cy="108" r="7" />
				</g>

				<g class="eyes-open">
					<circle class="dark" cx="78" cy="96" r="5.4" />
					<circle class="dark" cx="122" cy="96" r="5.4" />
					<g class="lids">
						<ellipse class="lid" cx="78" cy="96" rx="8" ry="8" />
						<ellipse class="lid" cx="122" cy="96" rx="8" ry="8" />
					</g>
				</g>
				<g class="eyes-glad">
					<path class="line thin" d="M71 99 Q78 89 85 99" />
					<path class="line thin" d="M115 99 Q122 89 129 99" />
				</g>
				<g class="brows">
					<path class="line thin" d="M69 90 L86 83" />
					<path class="line thin" d="M131 90 L114 83" />
				</g>

				<path class="mouth mouth-smile line thin" d="M92 108 Q100 116 108 108" />
				<path class="mouth mouth-open" d="M90 106 Q100 126 110 106 Z" />
				<path class="mouth mouth-frown line thin" d="M92 116 Q100 107 108 116" />
				<path class="tear" d="M80 106 Q75 114 80 118 Q85 114 80 106 Z" />
			</g>

			<!-- 腕 -->
			<g transform="translate(50 122)">
				<g class="arm-l"><path class="arm" d="M0 0 H48" /></g>
			</g>
			<g transform="translate(150 122)">
				<g class="arm-r"><path class="arm" d="M0 0 H48" /></g>
			</g>

			<!-- cheer の腕: 体の外側を回って頭上の帳簿へ（顔にかからない） -->
			<path class="arm arm-up" d="M48 118 C20 112 18 74 50 64 L74 69" />
			<path class="arm arm-up" d="M152 118 C180 112 182 74 150 64 L126 71" />

			<!-- 帳簿と手 -->
			<g class="hold">
				<g class="ledger-swing">
					<g transform="translate(100 150) rotate(-6)">
						<rect class="paper" x="-25" y="-27" width="50" height="54" rx="3" />
						<rect class="dark" x="-19" y="-22" width="38" height="6" rx="1.5" />
						<path class="rule" d="M-19 -9 H19 M-19 0 H19 M-19 9 H19 M-19 18 H19 M-4 -12 V22 M10 -12 V22" />
					</g>
					<circle class="dark" cx="74" cy="164" r="8" />
					<circle class="dark" cx="126" cy="166" r="8" />
				</g>
			</g>

			<!-- きらめき（cheer） -->
			<g class="sparks">
				<path class="spark s1" d="M30 40 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z" />
				<path class="spark s2" d="M170 60 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5 z" />
				<path class="spark s3" d="M160 14 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" />
			</g>
		</g>
	</g>
</svg>

<style>
	.boquito {
		--yellow: var(--bq-yellow, #f7c52b);
		--dark: var(--bq-dark, #4a3320);
		--wing: var(--bq-wing, #bfe6ee);
		--bag: var(--bq-bag, #b98a52);
		--bag-dark: var(--bq-bag-dark, #8a6236);
		--paper: var(--bq-paper, #ffffff);
		--rule: var(--bq-rule, #b7b0a4);
		--cheek: var(--bq-cheek, #f08a6c);
		--spark: var(--bq-spark, #ffd95e);
		--tear: var(--bq-tear, #8ec9e8);
		display: block;
		overflow: visible;
	}

	/* 塗りと線 */
	.dark {
		fill: var(--dark);
	}
	.line {
		fill: none;
		stroke: var(--dark);
		stroke-width: 5;
		stroke-linecap: round;
	}
	.line.thin {
		stroke-width: 3.6;
	}
	.body {
		fill: var(--yellow);
		stroke: var(--dark);
		stroke-width: 3;
	}
	.stripe {
		fill: var(--dark);
	}
	.wing {
		fill: var(--wing);
		fill-opacity: 0.75;
		stroke: var(--wing);
		stroke-width: 2;
	}
	.bag-body {
		fill: var(--bag);
		stroke: var(--bag-dark);
		stroke-width: 3;
	}
	.bag-flap {
		fill: none;
		stroke: var(--bag-dark);
		stroke-width: 3;
		stroke-linecap: round;
	}
	.strap-line {
		fill: none;
		stroke: var(--bag-dark);
		stroke-width: 7;
		stroke-linecap: round;
	}
	.buckle {
		fill: var(--bag);
		stroke: var(--bag-dark);
		stroke-width: 2;
	}
	.cheek {
		fill: var(--cheek);
		opacity: 0.28;
		transition: opacity 0.3s;
	}
	.lid {
		fill: var(--yellow);
	}
	.arm {
		fill: none;
		stroke: var(--dark);
		stroke-width: 7;
		stroke-linecap: round;
	}
	.paper {
		fill: var(--paper);
		stroke: var(--dark);
		stroke-width: 2.5;
	}
	.rule {
		fill: none;
		stroke: var(--rule);
		stroke-width: 1.4;
	}
	.mouth-open {
		fill: var(--dark);
	}
	.tear {
		fill: var(--tear);
	}
	.spark {
		fill: var(--spark);
		stroke: var(--dark);
		stroke-width: 1.5;
		stroke-linejoin: round;
	}

	/* 表情の出し分け */
	.arm-up,
	.eyes-glad,
	.brows,
	.mouth-open,
	.mouth-frown,
	.tear,
	.sparks {
		display: none;
	}
	.boquito[data-mood='happy'] .eyes-open,
	.boquito[data-mood='cheer'] .eyes-open {
		display: none;
	}
	.boquito[data-mood='happy'] .eyes-glad,
	.boquito[data-mood='cheer'] .eyes-glad,
	.boquito[data-mood='sad'] .brows,
	.boquito[data-mood='sad'] .mouth-frown,
	.boquito[data-mood='sad'] .tear,
	.boquito[data-mood='happy'] .mouth-open,
	.boquito[data-mood='cheer'] .mouth-open,
	.boquito[data-mood='cheer'] .arm-up,
	.boquito[data-mood='cheer'] .sparks {
		display: inline;
	}
	.boquito[data-mood='happy'] .mouth-smile,
	.boquito[data-mood='cheer'] .mouth-smile,
	.boquito[data-mood='sad'] .mouth-smile {
		display: none;
	}
	.boquito[data-mood='happy'] .cheek,
	.boquito[data-mood='cheer'] .cheek {
		opacity: 0.55;
	}
	.boquito[data-mood='sad'] .eyes-open {
		transform: translateY(2px);
	}

	/* 回転の中心（ユーザー座標） */
	.spin {
		transform-origin: 100px 112px;
	}
	.bob {
		transform-origin: 100px 168px;
	}
	.wing-l {
		transform-origin: 88px 70px;
	}
	.wing-r {
		transform-origin: 112px 70px;
	}
	.ant-l,
	.ant-r {
		transform-origin: 100px 66px;
	}
	.ant-pose {
		transition: transform 0.35s ease;
	}
	.ant-l .ant-pose {
		transform-origin: 84px 66px;
	}
	.ant-r .ant-pose {
		transform-origin: 116px 66px;
	}
	.bag {
		transform-origin: 40px 100px;
	}
	.lid {
		transform-box: fill-box;
		transform-origin: 50% 0%;
		transform: scaleY(0);
	}
	.arm-l,
	.arm-r {
		transform-origin: 0 0;
		transition: transform 0.35s ease;
	}
	.arm-l {
		transform: rotate(60deg);
	}
	.arm-r {
		transform: rotate(119deg) scale(1.04);
	}
	.hold {
		transition: transform 0.35s ease;
	}
	.ledger-swing {
		transform-origin: 100px 150px;
	}

	/* 気分ごとの姿勢（アニメが止まってもここは残る） */
	.boquito[data-mood='sad'] .ant-l .ant-pose {
		transform: rotate(-28deg);
	}
	.boquito[data-mood='sad'] .ant-r .ant-pose {
		transform: rotate(28deg);
	}
	.boquito[data-mood='sad'] .wing-l {
		transform: rotate(-22deg);
	}
	.boquito[data-mood='sad'] .wing-r {
		transform: rotate(22deg);
	}
	.boquito[data-mood='sad'] .bob {
		transform: translateY(4px) scale(1, 0.97);
	}
	.boquito[data-mood='cheer'] .arm-l,
	.boquito[data-mood='cheer'] .arm-r {
		display: none;
	}
	.boquito[data-mood='cheer'] .hold {
		transform: translateY(-95px);
	}

	/* idle: ふわふわ、羽ばたき、瞬き、触角のゆれ */
	.boquito[data-mood='idle'] .bob {
		animation: bq-float 2.6s ease-in-out infinite;
	}
	.boquito[data-mood='idle'] .wing-l {
		animation: bq-flap-l 0.2s ease-in-out infinite alternate;
	}
	.boquito[data-mood='idle'] .wing-r {
		animation: bq-flap-r 0.2s ease-in-out infinite alternate;
	}
	.boquito[data-mood='idle'] .ant-l {
		animation: bq-sway-l 2.4s ease-in-out infinite;
	}
	.boquito[data-mood='idle'] .ant-r {
		animation: bq-sway-r 2.4s ease-in-out infinite 0.3s;
	}
	.boquito[data-mood='idle'] .lid,
	.boquito[data-mood='sad'] .lid {
		animation: bq-blink 4.6s infinite;
	}

	/* happy: 跳ねる、羽が速い */
	.boquito[data-mood='happy'] .bob {
		animation: bq-hop 0.7s ease-in-out infinite;
	}
	.boquito[data-mood='happy'] .wing-l {
		animation: bq-flap-l 0.09s ease-in-out infinite alternate;
	}
	.boquito[data-mood='happy'] .wing-r {
		animation: bq-flap-r 0.09s ease-in-out infinite alternate;
	}
	.boquito[data-mood='happy'] .ant-l {
		animation: bq-sway-l 0.5s ease-in-out infinite;
	}
	.boquito[data-mood='happy'] .ant-r {
		animation: bq-sway-r 0.5s ease-in-out infinite;
	}

	/* sad: ゆっくり息をする、羽は小さく */
	.boquito[data-mood='sad'] .bob {
		animation: bq-sag 3.4s ease-in-out infinite;
	}
	.boquito[data-mood='sad'] .tear {
		animation: bq-tear 3.4s ease-in infinite;
	}

	/* cheer: 帳簿を掲げてくるっと回る */
	.boquito[data-mood='cheer'] .spin {
		animation: bq-twirl 2.4s ease-in-out infinite;
	}
	.boquito[data-mood='cheer'] .bob {
		animation: bq-hop 0.6s ease-in-out infinite;
	}
	.boquito[data-mood='cheer'] .wing-l {
		animation: bq-flap-l 0.09s ease-in-out infinite alternate;
	}
	.boquito[data-mood='cheer'] .wing-r {
		animation: bq-flap-r 0.09s ease-in-out infinite alternate;
	}
	.boquito[data-mood='cheer'] .ledger-swing {
		animation: bq-wave 0.6s ease-in-out infinite alternate;
	}
	.boquito[data-mood='cheer'] .spark {
		transform-box: fill-box;
		transform-origin: center;
		animation: bq-twinkle 0.9s ease-in-out infinite alternate;
	}
	.boquito[data-mood='cheer'] .s2 {
		animation-delay: 0.3s;
	}
	.boquito[data-mood='cheer'] .s3 {
		animation-delay: 0.6s;
	}

	@keyframes bq-float {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-6px);
		}
	}
	@keyframes bq-hop {
		0%,
		100% {
			transform: translateY(0) scale(1.04, 0.95);
		}
		40% {
			transform: translateY(-16px) scale(0.97, 1.04);
		}
	}
	@keyframes bq-sag {
		0%,
		100% {
			transform: translateY(4px) scale(1, 0.97);
		}
		50% {
			transform: translateY(6px) scale(1, 0.95);
		}
	}
	@keyframes bq-flap-l {
		from {
			transform: rotate(8deg);
		}
		to {
			transform: rotate(-14deg);
		}
	}
	@keyframes bq-flap-r {
		from {
			transform: rotate(-8deg);
		}
		to {
			transform: rotate(14deg);
		}
	}
	@keyframes bq-sway-l {
		0%,
		100% {
			transform: rotate(-5deg);
		}
		50% {
			transform: rotate(5deg);
		}
	}
	@keyframes bq-sway-r {
		0%,
		100% {
			transform: rotate(5deg);
		}
		50% {
			transform: rotate(-5deg);
		}
	}
	@keyframes bq-blink {
		0%,
		92%,
		100% {
			transform: scaleY(0);
		}
		95% {
			transform: scaleY(1);
		}
	}
	@keyframes bq-tear {
		0% {
			transform: translateY(0);
			opacity: 0;
		}
		20% {
			opacity: 1;
		}
		100% {
			transform: translateY(18px);
			opacity: 0;
		}
	}
	@keyframes bq-twirl {
		0%,
		15% {
			transform: rotate(0deg);
		}
		55%,
		100% {
			transform: rotate(360deg);
		}
	}
	@keyframes bq-wave {
		from {
			transform: rotate(-5deg);
		}
		to {
			transform: rotate(5deg);
		}
	}
	@keyframes bq-twinkle {
		from {
			transform: scale(0.6) rotate(0deg);
			opacity: 0.4;
		}
		to {
			transform: scale(1.1) rotate(20deg);
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.boquito *,
		.boquito {
			animation: none !important;
			transition: none !important;
		}
	}
</style>
