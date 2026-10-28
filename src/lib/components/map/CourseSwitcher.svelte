<script lang="ts">
	import type { CourseInfo } from '$lib/content/course';

	let { courses, activeId }: { courses: Array<CourseInfo & { locked?: boolean }>; activeId: string } = $props();
</script>

{#if courses.length > 1}
	<nav class="switcher">
		{#each courses as course (course.id)}
			{#if course.locked}
				<span class="tab locked" aria-disabled="true">{course.title}</span>
			{:else}
				<a
					class="tab"
					class:active={course.id === activeId}
					href="/?course={encodeURIComponent(course.id)}"
					aria-current={course.id === activeId ? 'page' : undefined}
				>
					{course.title}
				</a>
			{/if}
		{/each}
	</nav>
{/if}

<style>
	.switcher {
		display: flex;
		justify-content: center;
		gap: 8px;
		padding: 8px 16px 0;
	}

	.tab {
		padding: 0.5rem 1rem;
		border: 2px solid #e3e3e1;
		border-radius: 999px;
		font-size: 0.85rem;
		font-weight: 800;
		color: #767674;
		background: #ffffff;
		box-shadow: 0 3px 0 #e3e3e1;
		text-decoration: none;
	}

	.tab.locked {
		color: #afafaf;
		background: #f2f2f0;
		box-shadow: none;
		cursor: default;
	}

	.tab.active {
		color: #ffffff;
		border-color: #55c50d;
		background: #55c50d;
		box-shadow: 0 3px 0 #3f9a0a;
	}
</style>
