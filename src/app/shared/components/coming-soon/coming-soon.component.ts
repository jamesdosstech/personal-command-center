import { Component, input } from '@angular/core';

@Component({
  selector: 'app-coming-soon',
  standalone: true,
  template: `
    <section class="coming-soon">
      <span class="icon">
        {{ icon() }}
      </span>

      <p class="eyebrow">UNDER CONSTRUCTION</p>

      <h1>
        {{ title() }}
      </h1>

      <p>
        {{ description() }}
      </p>
    </section>
  `,
  styleUrl: './coming-soon.component.scss',
})
export class ComingSoonComponent {
  readonly icon = input('🚧');
  readonly title = input('Coming Soon');
  readonly description = input(
    'This part of your Command Center is still being built.'
  );
}
