import { TestBed } from '@angular/core/testing';
import { SharedPromptComponent } from './shared-prompt.component';

describe('SharedPromptComponent', () => {
  it('should name what was shared and hand each choice back', () => {
    const fixture = TestBed.createComponent(SharedPromptComponent);
    fixture.componentRef.setInput('summary', '1 project and 2 photos');
    fixture.componentRef.setInput('newCount', 1);
    fixture.detectChanges();
    const choices: string[] = [];
    fixture.componentInstance.dismiss.subscribe(() => choices.push('dismiss'));
    fixture.componentInstance.add.subscribe(() => choices.push('add'));

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.shared-prompt-title')!.textContent!.trim()).toEqual('Someone shared 1 project and 2 photos with you');
    expect(element.querySelector('.shared-prompt-text')!.textContent!.trim()).toEqual("1 isn't in your favorites yet.");

    const [dismiss, add] = [...element.querySelectorAll('button')];
    dismiss.click();
    add.click();
    expect(choices).toEqual(['dismiss', 'add']);
  });
});
