export default [
  // before migration
  `
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [RouterOutlet],
})
export class AppComponent {
  constructor() {
    // Ignore this, it is not relevant for this test.
    setTimeout(() => {
      /* void */
    });
  }
}
`,

  // after migration
  `
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [RouterOutlet],
})
export class AppComponent {
  constructor() {
    // Ignore this, it is not relevant for this test.
    setTimeout(() => {
      /* void */
    });
  }
}
`,
] as [string, string];
