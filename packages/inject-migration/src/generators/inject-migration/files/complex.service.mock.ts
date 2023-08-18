export default [
  // before migration
  `
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import {
  BehaviorSubject,
  distinctUntilChanged,
  filter,
  first,
  map,
  skip,
  startWith,
} from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AppService {
  readonly routerUrl$ = this.router.events.pipe(
    filter(event => event instanceof NavigationEnd),
    startWith(() => null),
    map(() => this.router.url.split('/').slice(1))
  );

  readonly firstView$ = this.router.events.pipe(
    filter(event => event instanceof NavigationStart),
    first()
  );
  // eslint-disable-next-line rxjs/no-exposed-subjects
  readonly sideNavShown$ = new BehaviorSubject<boolean>(false);

  constructor(
    private readonly router: Router,
    @Inject(PLATFORM_ID)
    private readonly platformId: string,
    @Inject(DOCUMENT)
    private readonly doc: Document
  ) {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        this.sideNavShown$.next(false);
      });

    if (isPlatformBrowser(this.platformId)) {
      this.sideNavShown$
        .pipe(distinctUntilChanged(), skip(1), takeUntilDestroyed())
        .subscribe(() => {
          this.doc.body.classList.toggle('menu-visible');
        });
    }
  }
}`,

  // after migration
  `
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import {
  BehaviorSubject,
  distinctUntilChanged,
  filter,
  first,
  map,
  skip,
  startWith,
} from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AppService {
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly doc = inject(DOCUMENT);
  readonly routerUrl$ = this.router.events.pipe(
    filter((event) => event instanceof NavigationEnd),
    startWith(() => null),
    map(() => this.router.url.split('/').slice(1))
  );

  readonly firstView$ = this.router.events.pipe(
    filter((event) => event instanceof NavigationStart),
    first()
  );
  // eslint-disable-next-line rxjs/no-exposed-subjects
  readonly sideNavShown$ = new BehaviorSubject<boolean>(false);

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        this.sideNavShown$.next(false);
      });

    if (isPlatformBrowser(this.platformId)) {
      this.sideNavShown$
        .pipe(distinctUntilChanged(), skip(1), takeUntilDestroyed())
        .subscribe(() => {
          this.doc.body.classList.toggle('menu-visible');
        });
    }
  }
}`,
] as [string, string];
